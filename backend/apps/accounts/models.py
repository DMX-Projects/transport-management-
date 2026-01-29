from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom User model with role-based access control"""
    
    ROLE_CHOICES = [
        ('SUPER_ADMIN', 'Super Admin'),
        ('ACCOUNTS_MANAGER', 'Accounts Manager'),
        ('ACCOUNTS_OPERATOR', 'Accounts Operator'),
        ('BRANCH_OPERATOR', 'Branch Operator'),
        ('AUDITOR', 'Auditor'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='BRANCH_OPERATOR')
    # Branch field will be added after masters migrations
    # branch = models.ForeignKey(
    #     'masters.Branch', 
    #     on_delete=models.SET_NULL, 
    #     null=True, 
    #     blank=True,
    #     related_name='users'
    # )
    phone = models.CharField(max_length=15, blank=True)
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    @property
    def is_admin(self):
        return self.role == 'SUPER_ADMIN'
    
    @property
    def is_accounts_manager(self):
        return self.role in ['SUPER_ADMIN', 'ACCOUNTS_MANAGER']
    
    @property
    def can_edit_delete(self):
        return self.role in ['SUPER_ADMIN', 'ACCOUNTS_MANAGER', 'ACCOUNTS_OPERATOR']
