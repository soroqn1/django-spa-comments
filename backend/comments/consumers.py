from channels.generic.websocket import AsyncJsonWebsocketConsumer


class CommentConsumer(AsyncJsonWebsocketConsumer):
    group_name = 'comments'

    async def connect(self):
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):  # pragma: no cover - best effort cleanup
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def comment_event(self, event):
        payload = event.get('payload', {})
        await self.send_json(payload)