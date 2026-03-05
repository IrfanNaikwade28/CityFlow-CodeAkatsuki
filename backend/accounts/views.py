from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer, LoginSerializer, UserSerializer

User = get_user_model()


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        tokens = get_tokens_for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            **tokens,
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']  # type: ignore[index]
        tokens = get_tokens_for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            **tokens,
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(UserSerializer(request.user).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def workers_list(request):
    """Admin: list all workers with computed task stats."""
    if request.user.role != 'admin':
        return Response({'detail': 'Forbidden'}, status=403)

    from django.db.models import Count, Q, Avg
    from django.utils import timezone

    workers = User.objects.filter(role='worker').annotate(
        open_tasks=Count(
            'assigned_issues',
            filter=Q(assigned_issues__status__in=['Submitted', 'Assigned', 'In Progress'])
        ),
        completed_tasks=Count(
            'assigned_issues',
            filter=Q(assigned_issues__status__in=['Resolved', 'Closed'])
        ),
    )

    data = []
    for w in workers:
        data.append({
            'id': w.id,
            'display_id': w.display_id,
            'name': w.full_name,
            'email': w.email,
            'phone': w.phone,
            'ward': w.ward,
            'category': w.category,
            'joined_date': w.joined_date,
            'open_tasks': w.open_tasks,
            'completed_tasks': w.completed_tasks,
            'status': 'Active',
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def worker_detail(request, pk):
    if request.user.role != 'admin':
        return Response({'detail': 'Forbidden'}, status=403)
    try:
        w = User.objects.get(pk=pk, role='worker')
    except User.DoesNotExist:
        return Response({'detail': 'Not found'}, status=404)

    from django.db.models import Count, Q
    stats = w.assigned_issues.aggregate(
        open_tasks=Count('id', filter=Q(status__in=['Submitted', 'Assigned', 'In Progress'])),
        completed_tasks=Count('id', filter=Q(status__in=['Resolved', 'Closed'])),
    )
    return Response({
        'id': w.id,
        'display_id': w.display_id,
        'name': w.full_name,
        'email': w.email,
        'phone': w.phone,
        'ward': w.ward,
        'category': w.category,
        'joined_date': w.joined_date,
        **stats,
    })
