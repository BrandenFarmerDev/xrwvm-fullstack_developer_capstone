import os
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from djangoapp.populate import initiate


class Command(BaseCommand):
    help = 'Populate course inventory and create an optional lab demo admin.'

    def handle(self, *args, **options):
        initiate()
        password = os.getenv('DEMO_ADMIN_PASSWORD')
        username = os.getenv('DEMO_ADMIN_USER', 'root')
        if password and not User.objects.filter(username=username).exists():
            User.objects.create_superuser(
                username=username, email='root@example.com', password=password
            )
            self.stdout.write(self.style.SUCCESS('Demo admin created.'))
        self.stdout.write(self.style.SUCCESS('Car inventory ready.'))
