from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Issue, IssueComment, IssueTimeline

User = get_user_model()


class AuthorSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='full_name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'display_id', 'name', 'role', 'ward']


class IssueCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)

    class Meta:
        model = IssueComment
        fields = ['id', 'user_id', 'user_name', 'text', 'created_at']
        read_only_fields = ['id', 'user_id', 'user_name', 'created_at']


class IssueTimelineSerializer(serializers.ModelSerializer):
    class Meta:
        model = IssueTimeline
        fields = ['id', 'status', 'note', 'changed_at']


class IssueSerializer(serializers.ModelSerializer):
    reported_by_detail = AuthorSerializer(source='reported_by', read_only=True)
    assigned_to_detail = AuthorSerializer(source='assigned_to', read_only=True)
    comments = IssueCommentSerializer(many=True, read_only=True)
    timeline = IssueTimelineSerializer(many=True, read_only=True)
    image_url = serializers.SerializerMethodField()
    completion_photo_url = serializers.SerializerMethodField()
    upvoted_by_me = serializers.SerializerMethodField()

    class Meta:
        model = Issue
        fields = [
            'id', 'display_id', 'title', 'description', 'category',
            'status', 'priority', 'priority_score',
            'ward', 'location_text', 'location_lat', 'location_lng',
            'is_public', 'upvotes',
            'image', 'image_url', 'completion_photo', 'completion_photo_url',
            'ai_completion_score', 'ai_completion_verdict',
            'reported_by', 'reported_by_detail',
            'assigned_to', 'assigned_to_detail',
            'reported_at', 'assigned_at', 'resolved_at',
            'comments', 'timeline',
            'upvoted_by_me',
        ]
        read_only_fields = [
            'id', 'display_id', 'priority_score', 'upvotes',
            'ai_completion_score', 'ai_completion_verdict',
            'reported_by', 'reported_at',
        ]
        extra_kwargs = {
            'image': {'write_only': True, 'required': False},
            'completion_photo': {'write_only': True, 'required': False},
            'assigned_to': {'write_only': True, 'required': False},
        }

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

    def get_completion_photo_url(self, obj):
        request = self.context.get('request')
        if obj.completion_photo and request:
            return request.build_absolute_uri(obj.completion_photo.url)
        return None

    def get_upvoted_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.upvote_records.filter(user=request.user).exists()
        return False


class IssueCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Issue
        fields = [
            'title', 'description', 'category', 'ward',
            'location_text', 'location_lat', 'location_lng',
            'is_public', 'image',
        ]
