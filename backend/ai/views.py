from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .services import (
    detect_issue,
    verify_completion,
    verify_completion_from_bytes,
    validate_civic_image,
    register_image_hash,
)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def validate_image_view(request):
    """
    POST /api/ai/validate-image/
    Multipart: image=<file>
    
    Validates an image BEFORE issue submission to detect fake/misleading reports.
    
    Returns:
        {
            'is_valid': bool,
            'rejection_reason': str | null,
            'confidence': float,
            'checks': {
                'has_civic_issue': bool,
                'is_outdoor_public': bool,
                'is_authentic': bool,
                'has_faces_only': bool,
                'is_quality_ok': bool,
            },
            'details': str,
            'can_proceed': bool,  # True if user can proceed with submission
        }
    
    Rejection reasons:
        - 'selfie_detected': Image is a selfie/portrait without civic issue context
        - 'indoor_location': Photo taken indoors, not public infrastructure
        - 'blank_or_blurry': Image quality too poor
        - 'no_civic_issue': No recognizable civic problem
        - 'meme_or_edited': Image appears edited/fake
        - 'private_property': Shows private property issue
        - 'screenshot_detected': Image is a screenshot
        - 'irrelevant_content': Random content not related to civic issues
        - 'duplicate_image': Same image submitted before
        - 'poor_image_quality': Failed basic quality checks
    """
    if 'image' not in request.FILES:
        return Response({'detail': 'image file is required.'}, status=400)
    
    image_file = request.FILES['image']
    result = validate_civic_image(image_file)
    
    return Response({
        'is_valid': result['is_valid'],
        'rejection_reason': result['rejection_reason'],
        'confidence': result['confidence'],
        'checks': result['checks'],
        'details': result['details'],
        'can_proceed': result['is_valid'],
        'image_hash': result.get('image_hash'),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def detect_issue_view(request):
    """
    POST /api/ai/detect-issue/
    Multipart: image=<file>
    Optional query param: ?validate=true (default) to run validation checks
    
    Returns: 
        If valid:
            {category, title, description, severity, confidence, validation, ai_available}
        If rejected:
            {rejected: true, validation: {is_valid: false, rejection_reason, ...}}
    """
    if 'image' not in request.FILES:
        return Response({'detail': 'image file is required.'}, status=400)
    
    # Check if validation should be skipped (admin override)
    validate = request.query_params.get('validate', 'true').lower() != 'false'
    if not validate and request.user.role != 'admin':
        validate = True  # Only admins can skip validation

    image_file = request.FILES['image']
    result = detect_issue(image_file, validate=validate, user_id=request.user.id)

    if result is None:
        # Fallback when AI fails — still return a usable response for demo flows
        return Response({
            'category': 'Public Facilities',
            'title': 'Reported issue (manual review)',
            'description': 'AI detection unavailable. Please review and edit the details if needed.',
            'confidence': 0.2,
            'ai_available': False,
        })
    
    # Check if validation rejected the image
    if result.get('rejected', False):
        return Response({
            'rejected': True,
            'validation': result.get('validation', {}),
            'image_hash': result.get('image_hash'),
            'message': _get_user_friendly_rejection_message(result.get('validation', {}).get('rejection_reason')),
            'ai_available': True,
        }, status=400)

    return Response({**result, 'ai_available': True})


def _get_user_friendly_rejection_message(rejection_reason: str | None) -> str:
    """Convert technical rejection reasons to user-friendly messages."""
    messages = {
        'selfie_detected': 'This appears to be a selfie or portrait photo. Please upload a photo showing the actual civic issue.',
        'indoor_location': 'This photo appears to be taken indoors. Civic issues should show outdoor public infrastructure.',
        'blank_or_blurry': 'The image is too blurry or unclear. Please take a clearer photo of the issue.',
        'no_civic_issue': 'We could not identify a civic/municipal issue in this image. Please ensure the problem is clearly visible.',
        'meme_or_edited': 'This image appears to be edited or a screenshot. Please upload an original photo.',
        'private_property': 'This appears to show a private property issue. We handle public infrastructure problems only.',
        'screenshot_detected': 'Screenshots are not accepted. Please upload an original photo of the issue.',
        'irrelevant_content': 'This image does not appear to show a civic issue. Please upload a relevant photo.',
        'duplicate_image': 'This image has already been submitted for another issue.',
        'poor_image_quality': 'Image quality is too low. Please upload a clearer, higher resolution photo.',
    }
    return messages.get(rejection_reason, 'This image could not be validated for issue reporting.')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def trigger_verify_view(request, issue_id):
    """
    POST /api/ai/verify-completion/<issue_id>/
    Manually trigger AI verification (admin use). Auto-triggered on worker upload too.
    Returns: {completion_score, verdict}
    """
    if request.user.role not in ('admin', 'worker'):
        return Response({'detail': 'Forbidden.'}, status=403)

    from issues.models import Issue
    try:
        issue = Issue.objects.get(pk=issue_id)
    except Issue.DoesNotExist:
        return Response({'detail': 'Issue not found.'}, status=404)

    if not issue.completion_photo:
        return Response({'detail': 'No completion photo uploaded yet.'}, status=400)

    result = verify_completion(issue)
    if result is None:
        return Response({'detail': 'AI verification failed. Check server logs.'}, status=500)

    Issue.objects.filter(pk=issue.pk).update(
        ai_completion_score=result['completion_score'],
        ai_completion_verdict=result['verdict'],
    )
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def preview_completion_view(request, issue_id):
    """
    POST /api/ai/preview-completion/<issue_id>/
    Multipart: completion_photo=<file>
    Scores the worker's photo against the before-image WITHOUT saving anything.
    Returns: {completion_score, verdict}
    Worker can review the AI assessment before deciding to submit & resolve.
    """
    if request.user.role != 'worker':
        return Response({'detail': 'Workers only.'}, status=403)

    if 'completion_photo' not in request.FILES:
        return Response({'detail': 'completion_photo is required.'}, status=400)

    from issues.models import Issue
    try:
        issue = Issue.objects.get(pk=issue_id)
    except Issue.DoesNotExist:
        return Response({'detail': 'Issue not found.'}, status=404)

    if issue.assigned_to_id != request.user.id:
        return Response({'detail': 'Not your task.'}, status=403)

    if not issue.image:
        # No before-photo — still score with just the after photo context
        return Response({
            'completion_score': 50,
            'verdict': 'No before-photo available for comparison. Score estimated.',
            'ai_available': False,
        })

    after_bytes = request.FILES['completion_photo'].read()
    after_mime = request.FILES['completion_photo'].content_type or 'image/jpeg'

    result = verify_completion_from_bytes(issue, after_bytes, after_mime)
    if result is None:
        return Response({'detail': 'AI preview failed.'}, status=500)

    return Response({**result, 'ai_available': True})
