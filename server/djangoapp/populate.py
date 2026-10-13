from django.db import transaction
from .models import CarMake, CarModel


@transaction.atomic
def initiate():
    inventory = {
        'NISSAN': ('Japanese technology', ['Pathfinder', 'Qashqai', 'XTRAIL']),
        'Mercedes': ('German technology', ['A-Class', 'C-Class', 'E-Class']),
        'Audi': ('German technology', ['A4', 'A5', 'A6']),
        'Kia': ('Korean technology', ['Sorrento', 'Carnival', 'Cerato']),
        'Toyota': ('Japanese technology', ['Corolla', 'Camry', 'Kluger']),
    }
    for name, (description, models) in inventory.items():
        make, _ = CarMake.objects.get_or_create(
            name=name, defaults={'description': description}
        )
        for model in models:
            CarModel.objects.get_or_create(
                car_make=make, name=model,
                defaults={'year': 2023, 'type': 'SUV', 'dealer_id': 1},
            )
