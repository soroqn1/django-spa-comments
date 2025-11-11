from asgiref.sync import async_to_sync
from celery import shared_task
from channels.layers import get_channel_layer
from django.core.cache import cache

from .models import Comment
from .serializers import CommentSerializer

CACHE_KEY_ALL_COMMENTS = 'comments:list'


def _serialize_comment(comment_id: int):
    comment = Comment.objects.filter(pk=comment_id).first()
    if not comment:
        return None
    serializer = CommentSerializer(comment, context={'request': None})
    return serializer.data


@shared_task
def broadcast_comment_update(comment_id: int):
    try:
        cache.delete(CACHE_KEY_ALL_COMMENTS)
    except Exception:
        pass
    layer = get_channel_layer()
    if layer is None:
        return

    payload = _serialize_comment(comment_id)
    message = {
        'type': 'comment_delete',
        'comment_id': comment_id,
    } if payload is None else {
        'type': 'comment_update',
        'comment': payload,
    }

    async_to_sync(layer.group_send)(
        'comments',
        {
            'type': 'comment.event',
            'payload': message,
        },
    )