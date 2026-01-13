from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom User model with role-based access control and branch association"""
    
    ROLE_CHOICES = [
        ('SUPER_ADMIN', 'Super Admin - Access to all branches'),
        ('BRANCH_MANAGER', 'Branch Manager'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='BRANCH_MANAGER')
    branch = models.ForeignKey(
        'masters.Branch', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='users',
        help_text='Branch assignment (null for admin/auditor roles)'
    )
    phone = models.CharField(max_length=15, blank=True)
    is_active_branch = models.BooleanField(default=True, help_text='User is active for their branch')
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        indexes = [
            models.Index(fields=['role', 'branch']),
            models.Index(fields=['is_active', 'is_active_branch']),
        ]
    
    def __str__(self):
        branch_name = f" - {self.branch.name}" if self.branch else " - All Branches"
        return f"{self.username} ({self.get_role_display()}{branch_name})"
    
    @property
    def is_admin(self):
        """Super Admin has access to all branches"""
        return self.role == 'SUPER_ADMIN'
    
    @property
    def can_access_all_branches(self):
        """Users who can see all branch data"""
        return self.role == 'SUPER_ADMIN'
    
    @property
    def can_edit(self):
        """Only SUPER_ADMIN can edit records"""
        return self.role == 'SUPER_ADMIN'
    
    def get_accessible_branches(self):
        """Get list of branches this user can access"""
        if self.can_access_all_branches:
            from apps.masters.models import Branch
            return Branch.objects.filter(is_active=True, is_deleted=False)
        elif self.branch:
            return [self.branch] if not self.branch.is_deleted and self.branch.is_active else []
        return []
    
    def save(self, *args, **kwargs):
        """Override save to automatically set SUPER_ADMIN role for superusers"""
        # If user is a superuser, automatically set role to SUPER_ADMIN and remove branch
        if self.is_superuser:
            self.role = 'SUPER_ADMIN'
            self.branch = None  # Super admins don't have a branch
        # If role is not set and user is not a superuser, use default
        elif not self.role:
            self.role = 'BRANCH_MANAGER'
        super().save(*args, **kwargs)
