import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../features/auth/authSlice';

/**
 * Custom hook to get current user and check permissions
 */
export function useAuth() {
    const user = useSelector(selectCurrentUser);
    
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const isBranchManager = user?.role === 'BRANCH_MANAGER';
    const canEdit = isSuperAdmin; // Only SUPER_ADMIN can edit
    const canDelete = false; // Delete is disabled for all roles
    
    return {
        user,
        isSuperAdmin,
        isBranchManager,
        canEdit,
        canDelete,
        isAuthenticated: !!user,
    };
}



