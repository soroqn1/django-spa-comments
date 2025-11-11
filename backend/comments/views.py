from django.core.cache import cache
from django.db.models import BooleanField, Exists, IntegerField, OuterRef, Subquery, Value
from django.db.models.functions import Coalesce
from django.db.models import Sum
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .models import Comment, CommentBookmark, CommentVote
from .serializers import CommentSerializer
from .tasks import CACHE_KEY_ALL_COMMENTS, broadcast_comment_update


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    cache_key = CACHE_KEY_ALL_COMMENTS
    cache_timeout = 60

    def _cache_get(self):
        try:
            return cache.get(self.cache_key)
        except Exception:
            return None

    def _cache_set(self, payload):
        try:
            cache.set(self.cache_key, payload, timeout=self.cache_timeout)
        except Exception:
            pass

    def _cache_delete(self):
        try:
            cache.delete(self.cache_key)
        except Exception:
            pass

    def _broadcast(self, comment_id: int):
        try:
            broadcast_comment_update.delay(comment_id)
        except Exception:
            pass

    def get_queryset(self):
        base_qs = Comment.objects.all().order_by('-created_at')
        qs = base_qs.annotate(
            score=Coalesce(Sum('votes__value'), Value(0), output_field=IntegerField())
        )

        user = getattr(self.request, 'user', None)
        if user and user.is_authenticated:
            vote_subquery = CommentVote.objects.filter(
                comment=OuterRef('pk'),
                user=user
            ).values('value')[:1]
            qs = qs.annotate(
                user_vote=Coalesce(Subquery(vote_subquery), Value(0), output_field=IntegerField()),
                is_bookmarked=Exists(
                    CommentBookmark.objects.filter(comment=OuterRef('pk'), user=user)
                ),
            )
        else:
            qs = qs.annotate(
                user_vote=Value(0, output_field=IntegerField()),
                is_bookmarked=Value(False, output_field=BooleanField()),
            )
        return qs

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            cached = self._cache_get()
            if cached is not None:
                return Response(cached)

        response = super().list(request, *args, **kwargs)

        if not request.user.is_authenticated and response.status_code == status.HTTP_200_OK:
            self._cache_set(response.data)

        return response

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            comment = serializer.save(user=self.request.user, user_name=self.request.user.username)
        else:
            comment = serializer.save()
        self._cache_delete()
        self._broadcast(comment.pk)

    def _response_with_comment(self, comment):
        refreshed = self.get_queryset().filter(pk=comment.pk).first()
        if not refreshed:
            return Response({'detail': 'Комментарий не найден'}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(refreshed)
        return Response(serializer.data)

    def perform_update(self, serializer):
        comment = serializer.save()
        self._cache_delete()
        self._broadcast(comment.pk)

    def perform_destroy(self, instance):
        comment_id = instance.pk
        super().perform_destroy(instance)
        self._cache_delete()
        self._broadcast(comment_id)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def vote(self, request, pk=None):
        comment = self.get_object()
        try:
            value = int(request.data.get('value'))
        except (TypeError, ValueError):
            return Response({'detail': 'Некорректное значение голоса'}, status=status.HTTP_400_BAD_REQUEST)

        if value not in (CommentVote.UPVOTE, CommentVote.DOWNVOTE):
            return Response({'detail': 'Голос должен быть 1 или -1'}, status=status.HTTP_400_BAD_REQUEST)

        CommentVote.objects.update_or_create(
            user=request.user,
            comment=comment,
            defaults={'value': value}
        )
        response = self._response_with_comment(comment)
        if response.status_code == status.HTTP_200_OK:
            self._cache_delete()
            self._broadcast(comment.pk)
        return response

    @vote.mapping.delete
    def remove_vote(self, request, pk=None):
        comment = self.get_object()
        CommentVote.objects.filter(user=request.user, comment=comment).delete()
        response = self._response_with_comment(comment)
        if response.status_code == status.HTTP_200_OK:
            self._cache_delete()
            self._broadcast(comment.pk)
        return response

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def bookmark(self, request, pk=None):
        comment = self.get_object()
        CommentBookmark.objects.get_or_create(user=request.user, comment=comment)
        response = self._response_with_comment(comment)
        if response.status_code == status.HTTP_200_OK:
            self._cache_delete()
            self._broadcast(comment.pk)
        return response

    @bookmark.mapping.delete
    def remove_bookmark(self, request, pk=None):
        comment = self.get_object()
        CommentBookmark.objects.filter(user=request.user, comment=comment).delete()
        response = self._response_with_comment(comment)
        if response.status_code == status.HTTP_200_OK:
            self._cache_delete()
            self._broadcast(comment.pk)
        return response
