import mimetypes
import re

from django.conf import settings
from django.db.models import Sum
from PIL import Image, UnidentifiedImageError
from rest_framework import serializers

from .models import Comment, CommentBookmark
from bleach.sanitizer import Cleaner


ALLOWED_IMAGE_TYPES = {
    'image/png',
    'image/jpeg',
    'image/gif',
}
MAX_IMAGE_SIZE = 5 * 1024 * 1024
MAX_TEXT_SIZE = 100 * 1024
ALLOWED_TAGS = ['a', 'code', 'i', 'strong']
ALLOWED_ATTRS = {'a': ['href', 'title']}
ALLOWED_PROTOCOLS = ['http', 'https', 'mailto']
ALLOWED_TAG_SET = set(ALLOWED_TAGS)
TAG_PATTERN = re.compile(r'<\s*/?\s*([a-z0-9]+)[^>]*>', re.IGNORECASE)


cleaner = Cleaner(
    tags=ALLOWED_TAGS,
    attributes=ALLOWED_ATTRS,
    protocols=ALLOWED_PROTOCOLS,
    strip=True,
    strip_comments=True,
)


class CommentSerializer(serializers.ModelSerializer):
    attachment_url = serializers.SerializerMethodField(read_only=True)
    score = serializers.SerializerMethodField(read_only=True)
    user_vote = serializers.SerializerMethodField(read_only=True)
    is_bookmarked = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Comment
        fields = [
            'id',
            'user',
            'user_name',
            'email',
            'home_page',
            'text',
            'created_at',
            'parent',
            'attachment',
            'attachment_name',
            'attachment_type',
            'attachment_size',
            'attachment_width',
            'attachment_height',
            'attachment_text_preview',
            'attachment_url',
            'score',
            'user_vote',
            'is_bookmarked',
        ]
        read_only_fields = [
            'id',
            'user',
            'created_at',
            'attachment_name',
            'attachment_type',
            'attachment_size',
            'attachment_width',
            'attachment_height',
            'attachment_text_preview',
            'score',
            'user_vote',
            'is_bookmarked',
        ]
        extra_kwargs = {
            'attachment': {'write_only': True, 'required': False, 'allow_null': True},
        }

    def validate_attachment(self, file):
        if not file:
            return file

        content_type = (file.content_type or mimetypes.guess_type(file.name)[0] or '').lower()

        if content_type in ALLOWED_IMAGE_TYPES:
            if file.size > MAX_IMAGE_SIZE:
                raise serializers.ValidationError('Изображение не должно превышать 5 МБ')
            return file

        if content_type == 'text/plain':
            if file.size > MAX_TEXT_SIZE:
                raise serializers.ValidationError('Текстовый файл не должен превышать 100 КБ')
            return file

        raise serializers.ValidationError('Допустимы только PNG, JPG, GIF или TXT')

    def validate_text(self, value: str):
        raw = value or ''
        for match in TAG_PATTERN.finditer(raw):
            tag = (match.group(1) or '').lower()
            if tag and tag not in ALLOWED_TAG_SET:
                raise serializers.ValidationError(f'Тег <{tag}> не поддерживается')

        cleaned = cleaner.clean(raw)
        if not cleaned.strip():
            raise serializers.ValidationError('Введите сообщение')
        return cleaned

    def get_score(self, obj: Comment):
        if hasattr(obj, 'score') and obj.score is not None:
            return int(obj.score)
        return int(obj.votes.aggregate(total=Sum('value'))['total'] or 0)

    def get_user_vote(self, obj: Comment):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return 0
        if hasattr(obj, 'user_vote') and obj.user_vote is not None:
            return int(obj.user_vote)
        vote = obj.votes.filter(user=user).first()
        return int(vote.value) if vote else 0

    def get_is_bookmarked(self, obj: Comment):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        if hasattr(obj, 'is_bookmarked') and obj.is_bookmarked is not None:
            return bool(obj.is_bookmarked)
        return CommentBookmark.objects.filter(user=user, comment=obj).exists()

    def create(self, validated_data):
        attachment = validated_data.get('attachment')
        if attachment:
            metadata = self._extract_metadata(attachment)
            validated_data.update(metadata)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        attachment = validated_data.get('attachment')
        if attachment:
            metadata = self._extract_metadata(attachment)
            validated_data.update(metadata)
        return super().update(instance, validated_data)

    def get_attachment_url(self, obj: Comment):
        if not obj.attachment:
            return None
        request = self.context.get('request')
        url = obj.attachment.url
        if request:
            return request.build_absolute_uri(url)
        if settings.DEBUG:
            return f"{settings.MEDIA_URL}{obj.attachment.name}"
        return url

    def _extract_metadata(self, file):
        content_type = (file.content_type or mimetypes.guess_type(file.name)[0] or '').lower()
        meta = {
            'attachment_name': file.name,
            'attachment_size': file.size,
            'attachment_width': 0,
            'attachment_height': 0,
            'attachment_type': '',
            'attachment_text_preview': '',
        }

        if content_type in ALLOWED_IMAGE_TYPES:
            meta['attachment_type'] = 'image'
            try:
                image = Image.open(file)
                meta['attachment_width'], meta['attachment_height'] = image.size
            except (UnidentifiedImageError, OSError):
                raise serializers.ValidationError('Не удалось обработать изображение')
            finally:
                file.seek(0)
        elif content_type == 'text/plain':
            meta['attachment_type'] = 'text'
            file.seek(0)
            snippet = file.read(4096)
            if isinstance(snippet, bytes):
                snippet = snippet.decode('utf-8', errors='ignore')
            meta['attachment_text_preview'] = snippet[:400]
            file.seek(0)
        else:
            raise serializers.ValidationError('Неподдерживаемый тип вложения')

        return meta
