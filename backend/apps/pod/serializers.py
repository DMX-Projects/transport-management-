from rest_framework import serializers
from .models import ProofOfDelivery


class ProofOfDeliverySerializer(serializers.ModelSerializer):
    """Serializer for Proof of Delivery (POD)"""
    
    class Meta:
        model = ProofOfDelivery
        fields = '__all__'
        read_only_fields = ['pod_number', 'created_at', 'updated_at']



