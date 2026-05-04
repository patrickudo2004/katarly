import React, { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Users, Search, Filter, Shield, MoreVertical, Mail, Phone, Calendar } from 'lucide-react';
import { RoleBadge } from '../components/RoleBadge';
import styles from './PeoplePage.module.css';

export const PeoplePage: React.FC = () => {
  const me = useQuery(api.users.me);
  const updateUserRole = useMutation(api.users.updateUserRole);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'dateJoined' | 'role'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const users = useQuery(api.users.getVisibleUsers, {
    searchTerm,
    roleFilter,
    statusFilter: 'active',
    sortBy,
    sortOrder
  });

  const roles = [
    'All', 'SuperAdmin', 'DeaconHead', 'PastoralOversight', 
    'DepartmentHead', 'DepartmentAssistant', 'DepartmentSecretary',
    'SubunitLead', 'SubunitAssistant', 'Volunteer', 'Probation'
  ];

  const handleRoleUpdate = async (userId: any, newRole: any) => {
    try {
      await updateUserRole({ userId, role: newRole });
      alert("Role updated successfully");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleInfo}>
          <Users className={styles.headerIcon} />
          <div>
            <h1>People & Teams</h1>
            <p>Manage church members, assign roles, and track service history.</p>
          </div>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input 
            placeholder="Search by name or email..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={styles.filters}>
          <Filter size={18} />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
            <option value="name">Sort by Name</option>
            <option value="role">Sort by Role</option>
            <option value="dateJoined">Sort by Date Joined</option>
          </select>
          <button 
            className={styles.sortToggle}
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? 'Asc' : 'Desc'}
          </button>
        </div>
      </div>

      <div className={styles.userGrid}>
        {users?.map(user => (
          <div key={user._id} className={styles.userCard}>
            <div className={styles.cardHeader}>
              <div className={styles.avatar}>
                {user.image ? <img src={user.image} alt={user.name} /> : (user.name?.[0] || user.email?.[0])}
              </div>
              <div className={styles.userInfo}>
                <h3>{user.name || 'Unnamed User'}</h3>
                <p>{user.email}</p>
              </div>
            </div>
            
            <div className={styles.cardContent}>
              <div className={styles.metaRow}>
                <Shield size={14} />
                <RoleBadge role={user.role} />
              </div>
              <div className={styles.metaRow}>
                <Calendar size={14} />
                <span>{user.departmentName} • {user.subunitName}</span>
              </div>
              {user.phone && (
                <div className={styles.metaRow}>
                  <Phone size={14} />
                  <span>{user.phone}</span>
                </div>
              )}
            </div>

            {me?.role === 'SuperAdmin' && (
              <div className={styles.cardActions}>
                <select 
                  className={styles.roleSelect}
                  value={user.role}
                  onChange={(e) => handleRoleUpdate(user._id, e.target.value)}
                >
                  {roles.filter(r => r !== 'All').map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
