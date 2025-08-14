from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

# Extend the default UserAdmin with proper deletion handling
class ExtendedUserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined', 'last_login')
    list_filter = BaseUserAdmin.list_filter
    
    # Ensure all CRUD permissions work properly
    def has_delete_permission(self, request, obj=None):
        """Allow superusers and users with delete permission to delete users"""
        return request.user.is_superuser or request.user.has_perm('auth.delete_user')
    
    def has_change_permission(self, request, obj=None):
        """Allow superusers and users with change permission to modify users"""
        return request.user.is_superuser or request.user.has_perm('auth.change_user')
    
    def has_add_permission(self, request):
        """Allow superusers and users with add permission to create users"""
        return request.user.is_superuser or request.user.has_perm('auth.add_user')
    
    def delete_queryset(self, request, queryset):
        """Handle bulk deletion with proper cascade handling"""
        count = queryset.count()
        # Django's CASCADE foreign keys will automatically handle related objects
        queryset.delete()
        self.message_user(request, f'{count} users and all related data deleted successfully.')
    
    def delete_model(self, request, obj):
        """Handle single user deletion with proper cascade handling"""
        username = obj.username
        # Django's CASCADE foreign keys will automatically handle related objects
        obj.delete()
        self.message_user(request, f'User "{username}" and all related data deleted successfully.')
    
    # Add bulk actions for user management
    actions = ['activate_users', 'deactivate_users']
    if hasattr(BaseUserAdmin, 'actions') and BaseUserAdmin.actions:
        actions.extend(list(BaseUserAdmin.actions))
    
    def activate_users(self, request, queryset):
        """Bulk activate users"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} users were successfully activated.')
    activate_users.short_description = "Activate selected users"
    
    def deactivate_users(self, request, queryset):
        """Bulk deactivate users"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} users were successfully deactivated.')
    deactivate_users.short_description = "Deactivate selected users"

# Unregister the default User admin if it exists
try:
    admin.site.unregister(User)
except admin.sites.NotRegistered:
    pass

# Register our extended UserAdmin
admin.site.register(User, ExtendedUserAdmin)
