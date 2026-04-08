"""
Gemini AI service layer for CityFlow.
Features:
  1. validate_civic_image(image_file) → {is_valid, rejection_reason, checks}
  2. detect_issue(image_file)  → {category, title, confidence, validation}
  3. verify_completion(issue)  → {completion_score, verdict}
  4. compute_image_hash(image_bytes) → perceptual hash for duplicate detection

Uses the google-genai SDK (replaces deprecated google-generativeai).
"""
import hashlib
import io
import json
import logging
from typing import BinaryIO

from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

_client = None

# ============================================================================
# IMAGE HASH STORAGE (In production, use database or Redis)
# ============================================================================
# Cache key prefix for image hashes
IMAGE_HASH_CACHE_PREFIX = 'cityflow:image_hash:'
IMAGE_HASH_TTL = 60 * 60 * 24 * 30  # 30 days


def _get_client():
    global _client
    # Always re-read the key so a server restart picks up a new .env value.
    # Reset cached client if the key has changed.
    current_key = settings.GEMINI_API_KEY
    if _client is None or getattr(_client, '_cityflow_api_key', None) != current_key:
        from google import genai
        _client = genai.Client(api_key=current_key)
        _client._cityflow_api_key = current_key
    return _client


def _parse_json_response(text: str) -> dict:
    """Extract JSON from Gemini response, tolerating markdown code fences."""
    text = text.strip()
    if text.startswith('```'):
        lines = text.split('\n')
        text = '\n'.join(lines[1:-1] if lines[-1].strip() == '```' else lines[1:])
    return json.loads(text)


# ============================================================================
# IMAGE HASHING & DUPLICATE DETECTION
# ============================================================================

def compute_image_hash(image_bytes: bytes) -> str:
    """
    Compute a perceptual hash of an image for duplicate detection.
    Uses average hash (aHash) algorithm - resistant to minor edits/resizing.
    
    Falls back to SHA256 if PIL is unavailable.
    """
    try:
        from PIL import Image
        
        img = Image.open(io.BytesIO(image_bytes))
        # Convert to grayscale and resize to 8x8
        img = img.convert('L').resize((8, 8), Image.Resampling.LANCZOS)
        
        # Get pixel data
        pixels = list(img.getdata())
        avg = sum(pixels) / len(pixels)
        
        # Create hash: 1 if pixel > average, else 0
        bits = ''.join('1' if p > avg else '0' for p in pixels)
        # Convert to hex
        return hex(int(bits, 2))[2:].zfill(16)
    except ImportError:
        # Fallback to content hash if PIL not available
        return hashlib.sha256(image_bytes).hexdigest()[:16]
    except Exception as e:
        logger.warning(f"Image hash computation failed: {e}")
        return hashlib.sha256(image_bytes).hexdigest()[:16]


def check_duplicate_image(image_hash: str, user_id: int | None = None) -> dict:
    """
    Check if this image hash has been submitted before.
    
    Returns:
        {'is_duplicate': bool, 'previous_issue_id': int | None}
    """
    cache_key = f"{IMAGE_HASH_CACHE_PREFIX}{image_hash}"
    previous = cache.get(cache_key)
    
    if previous:
        return {
            'is_duplicate': True,
            'previous_issue_id': previous.get('issue_id'),
            'previous_user_id': previous.get('user_id'),
            'submitted_at': previous.get('submitted_at'),
        }
    return {'is_duplicate': False, 'previous_issue_id': None}


def register_image_hash(image_hash: str, issue_id: int, user_id: int | None = None):
    """
    Register an image hash after successful issue creation.
    """
    from django.utils import timezone
    
    cache_key = f"{IMAGE_HASH_CACHE_PREFIX}{image_hash}"
    cache.set(cache_key, {
        'issue_id': issue_id,
        'user_id': user_id,
        'submitted_at': timezone.now().isoformat(),
    }, timeout=IMAGE_HASH_TTL)


# ============================================================================
# IMAGE QUALITY VALIDATION
# ============================================================================

def check_image_quality(image_bytes: bytes) -> dict:
    """
    Perform basic image quality checks using PIL.
    
    Checks:
    - Image can be opened (valid format)
    - Minimum resolution (not too small)
    - Not predominantly blank/single color
    - Basic blur detection using Laplacian variance
    
    Returns:
        {
            'is_valid': bool,
            'issues': list[str],
            'width': int,
            'height': int,
            'format': str,
            'blur_score': float,  # Higher = sharper
        }
    """
    issues = []
    result = {
        'is_valid': True,
        'issues': issues,
        'width': 0,
        'height': 0,
        'format': 'unknown',
        'blur_score': 0.0,
    }
    
    try:
        from PIL import Image
        import numpy as np
        
        img = Image.open(io.BytesIO(image_bytes))
        result['width'] = img.width
        result['height'] = img.height
        result['format'] = img.format or 'unknown'
        
        # Check minimum resolution
        MIN_DIMENSION = 100
        if img.width < MIN_DIMENSION or img.height < MIN_DIMENSION:
            issues.append(f"Image too small: {img.width}x{img.height} (minimum {MIN_DIMENSION}px)")
        
        # Check for blank/single-color images
        img_array = np.array(img.convert('RGB'))
        color_std = np.std(img_array)
        if color_std < 10:  # Very low variation = likely blank
            issues.append("Image appears blank or single-colored")
        
        # Blur detection using Laplacian variance
        gray = np.array(img.convert('L'), dtype=np.float64)
        
        # Simple Laplacian kernel
        laplacian = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]])
        from scipy import ndimage
        laplacian_img = ndimage.convolve(gray, laplacian)
        blur_score = laplacian_img.var()
        result['blur_score'] = float(blur_score)
        
        BLUR_THRESHOLD = 100  # Below this = likely blurry
        if blur_score < BLUR_THRESHOLD:
            issues.append(f"Image appears blurry (sharpness score: {blur_score:.1f})")
        
    except ImportError as e:
        logger.warning(f"PIL/numpy/scipy not available for quality checks: {e}")
        # Still allow submission, but flag as unchecked
        result['issues'].append("Quality checks skipped (dependencies unavailable)")
    except Exception as e:
        logger.warning(f"Image quality check failed: {e}")
        issues.append(f"Could not analyze image quality: {str(e)}")
    
    result['is_valid'] = len([i for i in issues if 'skipped' not in i.lower()]) == 0
    return result


# ============================================================================
# AI-POWERED IMAGE VALIDATION (Fake/Misleading Detection)
# ============================================================================

def validate_civic_image(image_file: BinaryIO) -> dict:
    """
    Comprehensive validation of an image for civic issue reporting.
    
    Detects FAKE or MISLEADING submissions:
    - Selfies or human faces without issue context
    - Indoor photos (not public infrastructure)
    - Blank, blurry, or corrupted images
    - Nature/scenic photos without civic problems
    - Random objects not related to public issues
    - Memes, screenshots, or edited images
    - Text-heavy images (screenshots of messages, etc.)
    
    Args:
        image_file: Django InMemoryUploadedFile or similar file-like object.
    
    Returns:
        {
            'is_valid': bool,
            'rejection_reason': str | None,
            'confidence': float,
            'checks': {
                'has_civic_issue': bool,
                'is_outdoor_public': bool,
                'is_authentic': bool,  # Not meme/screenshot/edited
                'has_faces_only': bool,  # Selfie detection
                'is_quality_ok': bool,
            },
            'details': str,  # AI explanation
            'image_hash': str,
            'duplicate_check': dict,
        }
    """
    try:
        from google.genai import types
        
        client = _get_client()
        
        # Read image bytes
        image_bytes = image_file.read()
        # Reset file pointer for potential re-use
        if hasattr(image_file, 'seek'):
            image_file.seek(0)
        
        mime_type = getattr(image_file, 'content_type', 'image/jpeg')
        
        # Step 1: Compute image hash and check duplicates
        image_hash = compute_image_hash(image_bytes)
        duplicate_check = check_duplicate_image(image_hash)
        
        # Step 2: Basic quality checks
        quality_result = check_image_quality(image_bytes)
        
        # Step 3: AI-powered content validation
        validation_prompt = """You are a civic issue image validator for CityFlow, a municipal complaint system in India.

Analyze this image and determine if it's a VALID civic/public issue report or a FAKE/MISLEADING submission.

VALID civic issues include:
- Potholes, broken roads, damaged footpaths
- Garbage dumps, overflowing bins, littering
- Water leakage, broken pipes, drainage problems, waterlogging
- Non-functioning streetlights, damaged electrical poles
- Traffic signal issues, missing road signs
- Damaged public property (benches, bus stops, railings)
- Open manholes, damaged sewers
- Illegal encroachments on public land

REJECT the image if it shows:
1. SELFIES or photos focused on human faces (no civic context)
2. INDOOR locations (homes, offices, shops) - not public infrastructure
3. BLANK, BLURRY, or unrecognizable images
4. NATURE/SCENIC photos without any civic problem
5. RANDOM OBJECTS not related to public infrastructure
6. MEMES, edited images, or screenshots
7. PRIVATE property issues (not municipal responsibility)
8. Text-heavy images (chat screenshots, documents)
9. Obviously staged or fake scenarios

Respond ONLY with valid JSON:
{
  "is_valid": <true if shows real civic issue, false otherwise>,
  "rejection_reason": "<null if valid, or specific reason: 'selfie_detected', 'indoor_location', 'blank_or_blurry', 'no_civic_issue', 'meme_or_edited', 'private_property', 'screenshot_detected', 'irrelevant_content'>",
  "confidence": <float 0.0 to 1.0>,
  "checks": {
    "has_civic_issue": <true/false>,
    "is_outdoor_public": <true/false>,
    "is_authentic": <true if real photo, false if meme/screenshot/edited>,
    "has_faces_only": <true if selfie/portrait without issue context>,
    "scene_type": "<outdoor_public, outdoor_private, indoor, unknown>"
  },
  "details": "<1-2 sentence explanation of what you see and why it is/isn't valid>"
}"""

        response = client.models.generate_content(
            model='gemini-flash-lite-latest',
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                validation_prompt,
            ],
        )
        
        ai_result = _parse_json_response(response.text)
        
        # Combine all validation results
        checks = ai_result.get('checks', {})
        checks['is_quality_ok'] = quality_result['is_valid']
        
        # Determine final validity
        is_valid = (
            ai_result.get('is_valid', False) and
            quality_result['is_valid'] and
            not duplicate_check['is_duplicate']
        )
        
        # Determine rejection reason
        rejection_reason = None
        if duplicate_check['is_duplicate']:
            rejection_reason = 'duplicate_image'
        elif not quality_result['is_valid']:
            rejection_reason = 'poor_image_quality'
        elif not ai_result.get('is_valid', False):
            rejection_reason = ai_result.get('rejection_reason', 'invalid_content')
        
        return {
            'is_valid': is_valid,
            'rejection_reason': rejection_reason,
            'confidence': float(ai_result.get('confidence', 0.5)),
            'checks': checks,
            'details': ai_result.get('details', ''),
            'image_hash': image_hash,
            'duplicate_check': duplicate_check,
            'quality_check': quality_result,
        }
        
    except Exception as e:
        logger.error(f"AI validate_civic_image failed: {e}", exc_info=True)
        # On AI failure, allow submission but flag as unvalidated
        return {
            'is_valid': True,  # Allow through on error (fail open)
            'rejection_reason': None,
            'confidence': 0.0,
            'checks': {
                'has_civic_issue': None,
                'is_outdoor_public': None,
                'is_authentic': None,
                'has_faces_only': None,
                'is_quality_ok': None,
                'validation_error': str(e),
            },
            'details': 'Validation could not be completed',
            'image_hash': None,
            'duplicate_check': {'is_duplicate': False},
            'quality_check': {'is_valid': True},
        }


def detect_issue(image_file, validate: bool = True, user_id: int | None = None) -> dict | None:
    """
    Analyze a citizen-uploaded image and return the detected issue category + title.
    
    Now includes comprehensive image validation to detect fake/misleading submissions.

    Args:
        image_file: Django InMemoryUploadedFile or similar file-like object.
        validate: If True, run validation checks before classification (default: True).
        user_id: Optional user ID for duplicate tracking.

    Returns:
        {
            'category': str,
            'title': str,
            'description': str,
            'confidence': float,
            'validation': {  # Only if validate=True
                'is_valid': bool,
                'rejection_reason': str | None,
                'checks': dict,
                'details': str,
            },
            'image_hash': str,
        }
        or None on failure.
    """
    try:
        from google.genai import types

        client = _get_client()

        image_bytes = image_file.read()
        # Reset file pointer for potential re-use
        if hasattr(image_file, 'seek'):
            image_file.seek(0)
        mime_type = getattr(image_file, 'content_type', 'image/jpeg')
        
        # Compute image hash for duplicate detection
        image_hash = compute_image_hash(image_bytes)
        
        # Run validation if requested
        validation_result = None
        if validate:
            # Reset file pointer and run validation
            if hasattr(image_file, 'seek'):
                image_file.seek(0)
            validation_result = validate_civic_image(image_file)
            
            # If validation fails, return early with rejection info
            if not validation_result['is_valid']:
                return {
                    'category': None,
                    'title': None,
                    'description': None,
                    'confidence': 0.0,
                    'validation': {
                        'is_valid': False,
                        'rejection_reason': validation_result['rejection_reason'],
                        'checks': validation_result['checks'],
                        'details': validation_result['details'],
                    },
                    'image_hash': image_hash,
                    'rejected': True,
                }

        # Enhanced prompt with severity assessment
        prompt = """You are a municipal issue classifier for Ichalkaranji, Maharashtra, India.
Analyze this image carefully and identify any civic/municipal problems visible.

Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{
  "category": "<one of: Road, Water, Electricity, Garbage, Traffic, Public Facilities>",
  "title": "<concise 5-10 word issue title describing the specific problem>",
  "description": "<2-3 sentence description of the issue: what is visible, how severe it looks, and what impact it may have on citizens>",
  "severity": "<one of: low, medium, high, critical>",
  "confidence": <float between 0.0 and 1.0>,
  "location_hints": "<any visible location markers like shop names, landmarks, street signs, or identifiable features>"
}

Severity guide:
- critical: Immediate danger to life (open manholes, live wires, major road collapse)
- high: Significant public inconvenience (large potholes, major water leakage, garbage pile)
- medium: Moderate issues (small potholes, minor leaks, overflowing bin)
- low: Minor issues (cracked pavement, flickering light, small litter)

If no civic issue is visible, use category "Public Facilities" with low confidence."""

        response = client.models.generate_content(
            model='gemini-flash-lite-latest',
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                prompt,
            ],
        )

        result = _parse_json_response(response.text)

        valid_categories = ['Road', 'Water', 'Electricity', 'Garbage', 'Traffic', 'Public Facilities']
        if result.get('category') not in valid_categories:
            result['category'] = 'Public Facilities'
        
        valid_severities = ['low', 'medium', 'high', 'critical']
        severity = result.get('severity', 'medium').lower()
        if severity not in valid_severities:
            severity = 'medium'

        response_data = {
            'category':       result.get('category', 'Public Facilities'),
            'title':          result.get('title', 'Municipal issue detected'),
            'description':    result.get('description', ''),
            'severity':       severity,
            'confidence':     float(result.get('confidence', 0.5)),
            'location_hints': result.get('location_hints', ''),
            'image_hash':     image_hash,
            'rejected':       False,
        }
        
        if validation_result:
            response_data['validation'] = {
                'is_valid': validation_result['is_valid'],
                'rejection_reason': validation_result['rejection_reason'],
                'checks': validation_result['checks'],
                'details': validation_result['details'],
            }
        
        return response_data

    except Exception as e:
        logger.error(f"AI detect_issue failed: {e}", exc_info=True)
        return None


def verify_completion(issue) -> dict | None:
    """
    Compare before (citizen) and after (worker) images and score completion.

    Args:
        issue: Issue model instance with both .image and .completion_photo set.

    Returns:
        {'completion_score': int 0-100, 'verdict': str}
        or None on failure.
    """
    try:
        if not issue.image or not issue.completion_photo:
            return None

        with open(issue.image.path, 'rb') as f:
            before_bytes = f.read()
        with open(issue.completion_photo.path, 'rb') as f:
            after_bytes = f.read()

        return verify_completion_from_bytes(issue, after_bytes, 'image/jpeg', before_bytes=before_bytes)

    except Exception as e:
        logger.error(f"AI verify_completion failed for issue {issue.pk}: {e}")
        return None


def verify_completion_from_bytes(issue, after_bytes: bytes, after_mime: str, before_bytes: bytes | None = None) -> dict | None:
    """
    Score a worker's completion photo against the before-image.
    Accepts raw bytes so the after-photo need not be saved to disk yet.

    Args:
        issue:        Issue model instance (used for title/category/before-image path).
        after_bytes:  Raw bytes of the worker's completion photo.
        after_mime:   MIME type of the after photo (e.g. 'image/jpeg').
        before_bytes: Raw bytes of the before photo. If None, read from issue.image.path.

    Returns:
        {'completion_score': int 0-100, 'verdict': str}
        or None on failure.
    """
    try:
        from google.genai import types

        client = _get_client()

        if before_bytes is None:
            if not issue.image:
                return None
            with open(issue.image.path, 'rb') as f:
                before_bytes = f.read()

        prompt = f"""You are a municipal work verification system for CityFlow, Ichalkaranji.

The FIRST image is the BEFORE photo of a reported issue: "{issue.title}" (Category: {issue.category}).
The SECOND image is the AFTER photo submitted by the field worker claiming the work is done.

Compare both images carefully. Assess:
- How much of the original problem has been resolved?
- Is the work quality acceptable?
- Any remaining issues?

Respond ONLY with valid JSON (no markdown, no extra text):
{{
  "completion_score": <integer 0 to 100, where 100 = fully resolved>,
  "verdict": "<1-2 sentence honest assessment of the work quality and completion>"
}}"""

        response = client.models.generate_content(
            model='gemini-flash-lite-latest',
            contents=[
                types.Part.from_bytes(data=before_bytes, mime_type='image/jpeg'),
                types.Part.from_bytes(data=after_bytes, mime_type=after_mime),
                prompt,
            ],
        )

        result = _parse_json_response(response.text)
        return {
            'completion_score': max(0, min(100, int(result.get('completion_score', 50)))),
            'verdict': result.get('verdict', 'Work completion assessed by AI.'),
        }

    except Exception as e:
        logger.error(f"AI verify_completion_from_bytes failed for issue {issue.pk}: {e}")
        return None


# ============================================================================
# QUICK VALIDATION HELPERS
# ============================================================================

def quick_validate(image_bytes: bytes) -> dict:
    """
    Perform only local (non-AI) validation checks for fast feedback.
    Use this for instant validation before making AI calls.
    
    Args:
        image_bytes: Raw image bytes
    
    Returns:
        {
            'passes_basic_checks': bool,
            'image_hash': str,
            'is_duplicate': bool,
            'quality': dict,
        }
    """
    image_hash = compute_image_hash(image_bytes)
    duplicate_check = check_duplicate_image(image_hash)
    quality_check = check_image_quality(image_bytes)
    
    passes = quality_check['is_valid'] and not duplicate_check['is_duplicate']
    
    return {
        'passes_basic_checks': passes,
        'image_hash': image_hash,
        'is_duplicate': duplicate_check['is_duplicate'],
        'duplicate_info': duplicate_check if duplicate_check['is_duplicate'] else None,
        'quality': quality_check,
    }


def get_rejection_reasons() -> dict:
    """
    Return all possible rejection reasons with descriptions.
    Useful for API documentation and frontend handling.
    """
    return {
        'selfie_detected': {
            'code': 'selfie_detected',
            'message': 'Image is a selfie/portrait without civic issue context',
            'user_action': 'Please upload a photo showing the actual civic issue.',
        },
        'indoor_location': {
            'code': 'indoor_location',
            'message': 'Photo taken indoors, not public infrastructure',
            'user_action': 'Civic issues should show outdoor public infrastructure.',
        },
        'blank_or_blurry': {
            'code': 'blank_or_blurry',
            'message': 'Image quality too poor to assess',
            'user_action': 'Please take a clearer photo of the issue.',
        },
        'no_civic_issue': {
            'code': 'no_civic_issue',
            'message': 'No recognizable civic/municipal problem visible',
            'user_action': 'Please ensure the problem is clearly visible in the photo.',
        },
        'meme_or_edited': {
            'code': 'meme_or_edited',
            'message': 'Image appears to be edited, a meme, or artificially generated',
            'user_action': 'Please upload an original photo from your camera.',
        },
        'private_property': {
            'code': 'private_property',
            'message': 'Shows private property issue, not municipal responsibility',
            'user_action': 'We handle public infrastructure problems only.',
        },
        'screenshot_detected': {
            'code': 'screenshot_detected',
            'message': 'Image is a screenshot, not an original photo',
            'user_action': 'Please upload an original photo of the issue.',
        },
        'irrelevant_content': {
            'code': 'irrelevant_content',
            'message': 'Image content not related to civic issues',
            'user_action': 'Please upload a photo showing a public infrastructure problem.',
        },
        'duplicate_image': {
            'code': 'duplicate_image',
            'message': 'This exact image has been submitted before',
            'user_action': 'Please take a new photo of the issue.',
        },
        'poor_image_quality': {
            'code': 'poor_image_quality',
            'message': 'Image failed basic quality checks',
            'user_action': 'Please upload a clearer, higher resolution photo.',
        },
    }
