from django.db import models
from django.contrib.auth.models import User


class Comment(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='comments'
    )
    user_name = models.CharField(max_length=100)
    email = models.EmailField()
    home_page = models.URLField(blank=True, null=True)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        related_name='replies',
        on_delete=models.CASCADE
    )
    attachment = models.FileField(upload_to='attachments/', null=True, blank=True)
    attachment_name = models.CharField(max_length=255, blank=True)
    attachment_type = models.CharField(max_length=20, blank=True)
    attachment_size = models.PositiveIntegerField(default=0)
    attachment_width = models.PositiveIntegerField(default=0)
    attachment_height = models.PositiveIntegerField(default=0)
    attachment_text_preview = models.TextField(blank=True)

    def __str__(self):
        return f"{self.user_name}: {self.text[:30]}"

