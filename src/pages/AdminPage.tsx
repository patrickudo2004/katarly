import React, { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Organogram } from '../components/Organogram';
import { AdminSettings } from '../components/AdminSettings';
import { BorrowRequestForm } from '../components/BorrowRequestForm';
import { VerificationCenter } from '../components/VerificationCenter';
import { Users, Mail, Settings, Shield, Loader2, Plus, Trash2, UserCog, ChevronRight, Building2, Briefcase, ShieldCheck, Search } from 'lucide-react';
import styles from './AdminPage.module.css';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'users' | 'settings' | 'borrow' | 'verifications'>('hierarchy');
  const activeUser = useQuery(api.users.me);
  const myChurch = useQuery(api.churches.getMyChurch);
  const organogramData = useQuery(api.churches.getOrganogram);
  const departments = useQuery(api.departments.getDepartments);
  const subunits = useQuery(api.subunits.getSubunits);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');
  const [sortBy, setSortBy] = useState<'name' | 'dateJoined' | 'role'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const users = useQuery(api.users.getAllChurchUsers, {
    searchTerm,
    roleFilter,
    statusFilter,
    sortBy,
    sortOrder
  });
  
  const archiveUser = useMutation(api.users.archiveUser);
  const unarchiveUser = useMutation(api.users.unarchiveUser);
  
  const createDept = useMutation(api.departments.createDepartment);
  const updateDept = useMutation(api.departments.updateDepartment);
  const deleteDept = useMutation(api.departments.deleteDepartment);
  const createSubunit = useMutation(api.subunits.createSubunit);
  const updateSubunitMutation = useMutation(api.subunits.updateSubunit);
  const deleteSubunit = useMutation(api.subunits.deleteSubunit);
  const updateUserRole = useMutation(api.users.updateUserRole);

  const [isAddingDept, setIsAddingDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editingDeptName, setEditingDeptName] = useState('');

  const [isAddingSubunit, setIsAddingSubunit] = useState(false);
  const [newSubunit, setNewSubunit] = useState({ name: '', departmentId: '' as any });
  const [editingSubunitId, setEditingSubunitId] = useState<string | null>(null);
  const [editingSubunitName, setEditingSubunitName] = useState('');

  const updateDeptHeads = useMutation(api.departments.updateDepartmentHeads);

  const handleRoleChange = async (userId: any, role: string) => {
    try {
      await updateUserRole({ userId, role: role as any });
    } catch (err: any) {
      alert(err.message || "Failed to update user role.");
    }
  };

  const handleArchive = async (userId: any) => {
    if (userId === activeUser?._id) {
      alert("You cannot archive yourself.");
      return;
    }
    if (!confirm("Are you sure you want to archive this user? They will be removed from all active rosters.")) return;
    try {
      await archiveUser({ userId });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUnarchive = async (userId: any) => {
    try {
      await unarchiveUser({ userId });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDept({ name: newDeptName });
      setNewDeptName('');
      setIsAddingDept(false);
    } catch (err) {
      alert("Failed to create department");
    }
  };

  const handleDeleteDept = async (id: any) => {
    try {
      await deleteDept({ id });
    } catch (err: any) {
      alert(err.message || "Failed to delete department. Ensure it has no active subunits.");
    }
  };

  const handleUpdateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeptId) return;
    try {
      await updateDept({ id: editingDeptId as any, name: editingDeptName });
      setEditingDeptId(null);
    } catch (err) {
      alert("Failed to update department");
    }
  };

  const handleUpdateSubunit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubunitId) return;
    try {
      await updateSubunitMutation({ id: editingSubunitId as any, name: editingSubunitName });
      setEditingSubunitId(null);
    } catch (err) {
      alert("Failed to update subunit");
    }
  };

  const handleCreateSubunit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSubunit({ name: newSubunit.name, departmentId: newSubunit.departmentId });
      setNewSubunit({ name: '', departmentId: '' as any });
      setIsAddingSubunit(false);
    } catch (err) {
      alert("Failed to create subunit. Ensure you selected a department.");
    }
  };

  if (organogramData === undefined || subunits === undefined || users === undefined || departments === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* ... header remains same ... */}
      <header className={styles.header}>
        <div className={styles.titleInfo}>
          <Shield className={styles.headerIcon} />
          <div>
            <h1>Church Administration</h1>
            <p>Manage hierarchy, permissions, and settings.</p>
          </div>
        </div>
        <div className={styles.tabSwitcher}>
          <button className={activeTab === 'hierarchy' ? styles.activeTab : ''} onClick={() => setActiveTab('hierarchy')}>Hierarchy</button>
          <button className={activeTab === 'users' ? styles.activeTab : ''} onClick={() => setActiveTab('users')}>Users</button>
          {activeUser?.role !== 'Volunteer' && (
            <button className={activeTab === 'verifications' ? styles.activeTab : ''} onClick={() => setActiveTab('verifications')}>Verifications</button>
          )}
          <button className={activeTab === 'borrow' ? styles.activeTab : ''} onClick={() => setActiveTab('borrow')}>Borrow Teams</button>
          <button className={activeTab === 'settings' ? styles.activeTab : ''} onClick={() => setActiveTab('settings')}>Settings</button>
        </div>
      </header>

      <div className={styles.mainContent}>
        {activeTab === 'hierarchy' && (
          <div className={styles.tabPane}>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <Building2 size={20} />
                <h2>Departments</h2>
                {activeUser?.role === 'SuperAdmin' && (
                  <button className={styles.addBtn} onClick={() => setIsAddingDept(true)}>
                    <Plus size={16} /> Add Dept
                  </button>
                )}
              </div>

              {isAddingDept && (
                <form onSubmit={handleCreateDept} className={styles.inlineForm}>
                  <input placeholder="Dept Name" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} required />
                  <button type="submit">Save</button>
                  <button type="button" onClick={() => setIsAddingDept(false)}>Cancel</button>
                </form>
              )}

              <div className={styles.subunitList}>
                {departments.map(dept => (
                  <div key={dept._id} className={styles.subunitCard}>
                    <div className={styles.cardInfo}>
                      {editingDeptId === dept._id ? (
                        <form onSubmit={handleUpdateDept} className={styles.editForm}>
                          <input 
                            value={editingDeptName} 
                            onChange={e => setEditingDeptName(e.target.value)} 
                            autoFocus
                          />
                          <div className={styles.editActions}>
                            <button type="submit" className={styles.saveBtn}>Save</button>
                            <button type="button" onClick={() => setEditingDeptId(null)} className={styles.cancelBtn}>Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <div className={styles.nameRow}>
                          <strong>{dept.name}</strong>
                          {activeUser?.role === 'SuperAdmin' && (
                            <button 
                              className={styles.editIconBtn}
                              onClick={() => {
                                setEditingDeptId(dept._id);
                                setEditingDeptName(dept.name);
                              }}
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      )}
                      <div className={styles.assignmentRow}>
                        <label>Head:</label>
                        <select 
                          value={dept.headId || ''} 
                          onChange={(e) => updateDeptHeads({ id: dept._id, headId: e.target.value as any || null })}
                          disabled={activeUser?.role === 'DeaconHead' && activeUser.departmentId !== dept._id}
                        >
                          <option value="">Unassigned</option>
                          {users.map(u => <option key={u._id} value={u._id}>{u.name || u.email}</option>)}
                        </select>
                      </div>
                      <div className={styles.assignmentRow}>
                        <label>Assistant:</label>
                        <select 
                          value={dept.assistantId || ''} 
                          onChange={(e) => updateDeptHeads({ id: dept._id, assistantId: e.target.value as any || null })}
                          disabled={activeUser?.role === 'DeaconHead' && activeUser.departmentId !== dept._id}
                        >
                          <option value="">Unassigned</option>
                          {users.map(u => <option key={u._id} value={u._id}>{u.name || u.email}</option>)}
                        </select>
                      </div>
                    </div>
                    {activeUser?.role === 'SuperAdmin' && (
                      <button onClick={() => handleDeleteDept(dept._id)} className={styles.deleteBtn}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <Users size={20} />
                <h2>Subunits</h2>
                {activeUser?.role === 'SuperAdmin' && (
                  <button 
                    className={styles.addBtn}
                    onClick={() => setIsAddingSubunit(true)}
                  >
                    <Plus size={16} /> Add Subunit
                  </button>
                )}
              </div>

              {isAddingSubunit && (
                <form onSubmit={handleCreateSubunit} className={styles.inlineForm}>
                  <input 
                    placeholder="Subunit Name" 
                    value={newSubunit.name}
                    onChange={e => setNewSubunit({...newSubunit, name: e.target.value})}
                    required
                  />
                  <select 
                    value={newSubunit.departmentId}
                    onChange={e => setNewSubunit({...newSubunit, departmentId: e.target.value as any})}
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                  </select>
                  <button type="submit">Save</button>
                  <button type="button" onClick={() => setIsAddingSubunit(false)}>Cancel</button>
                </form>
              )}

              <div className={styles.subunitList}>
                {subunits.map(sub => (
                  <div key={sub._id} className={styles.subunitCard}>
                    <div className={styles.cardInfo}>
                      {editingSubunitId === sub._id ? (
                        <form onSubmit={handleUpdateSubunit} className={styles.editForm}>
                          <input 
                            value={editingSubunitName} 
                            onChange={e => setEditingSubunitName(e.target.value)} 
                            autoFocus
                          />
                          <div className={styles.editActions}>
                            <button type="submit" className={styles.saveBtn}>Save</button>
                            <button type="button" onClick={() => setEditingSubunitId(null)} className={styles.cancelBtn}>Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <div className={styles.nameRow}>
                          <div className={styles.nameWithBadge}>
                            <strong>{sub.name}</strong>
                            <span className={styles.deptBadge}>{sub.departmentName}</span>
                          </div>
                          {activeUser?.role === 'SuperAdmin' && (
                            <button 
                              className={styles.editIconBtn}
                              onClick={() => {
                                setEditingSubunitId(sub._id);
                                setEditingSubunitName(sub.name);
                              }}
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      )}
                      <div className={styles.assignmentRow}>
                        <label>Lead:</label>
                        <select 
                          value={sub.leadId || ''} 
                          onChange={(e) => updateSubunitMutation({ id: sub._id, leadId: e.target.value as any || null })}
                          disabled={activeUser?.role === 'DeaconHead' && activeUser.departmentId !== sub.departmentId}
                        >
                          <option value="">Unassigned</option>
                          {users.map(u => <option key={u._id} value={u._id}>{u.name || u.email}</option>)}
                        </select>
                      </div>
                      <div className={styles.assignmentRow}>
                        <label>Assistant:</label>
                        <select 
                          value={sub.assistantId || ''} 
                          onChange={(e) => updateSubunitMutation({ id: sub._id, assistantId: e.target.value as any || null })}
                          disabled={activeUser?.role === 'DeaconHead' && activeUser.departmentId !== sub.departmentId}
                        >
                          <option value="">Unassigned</option>
                          {users.map(u => <option key={u._id} value={u._id}>{u.name || u.email}</option>)}
                        </select>
                      </div>
                    </div>
                    {activeUser?.role === 'SuperAdmin' && (
                      <button onClick={() => deleteSubunit({ id: sub._id })} className={styles.deleteBtn}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'users' && (
          <div className={styles.tabPane}>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <UserCog size={20} />
                <h2>Member Directory</h2>
              </div>

              {/* Advanced Filters */}
              <div className={styles.filterBar}>
                <div className={styles.searchBox}>
                  <Search size={16} />
                  <input 
                    placeholder="Search name or email..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className={styles.filterGroup}>
                  <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                    <option value="All">All Roles</option>
                    <option value="SuperAdmin">Super Admin</option>
                    <option value="DeaconHead">Deacon Head</option>
                    <option value="DepartmentHead">Dept. Head</option>
                    <option value="SubunitLead">Subunit Lead</option>
                    <option value="Volunteer">Volunteer</option>
                    <option value="Probation">Probation</option>
                  </select>

                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
                    <option value="active">Active Members</option>
                    <option value="archived">Archived Records</option>
                  </select>

                  <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
                    <option value="name">Sort by Name</option>
                    <option value="role">Sort by Role</option>
                    <option value="dateJoined">Sort by Date Joined</option>
                  </select>

                  <button 
                    className={styles.sortOrderBtn}
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? 'Asc' : 'Desc'}
                  </button>
                </div>
              </div>

              <div className={styles.userTableWrapper}>
                <table className={styles.userTable}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Dept/Subunit</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users?.map(user => (
                      <tr key={user._id}>
                        <td>{user.name || user.email}</td>
                        <td>
                          <select 
                            value={user.role || 'Volunteer'}
                            onChange={(e) => handleRoleChange(user._id, e.target.value)}
                            className={styles.roleSelect}
                            disabled={
                              activeUser?.role === 'DeaconHead' && 
                              user.departmentId !== activeUser.departmentId
                            }
                          >
                            <option value="Volunteer">Volunteer</option>
                            <option value="Probation">Probation</option>
                            <option value="SubunitAssistant">Subunit Assistant</option>
                            <option value="SubunitLead">Subunit Lead</option>
                            <option value="DepartmentSecretary">Dept. Secretary</option>
                            <option value="DepartmentAssistant">Dept. Assistant</option>
                            <option value="DepartmentHead">Department Head</option>
                            <option value="PastoralOversight">Pastoral Oversight</option>
                            <option value="DeaconHead">Deacon Head</option>
                            <option value="SuperAdmin">Super Admin</option>
                          </select>
                        </td>
                        <td>
                          <div className={styles.assignmentCell}>
                            <select 
                              value={user.departmentId || ''}
                              onChange={(e) => updateUserRole({ userId: user._id, departmentId: e.target.value as any || undefined, role: user.role as any })}
                              disabled={activeUser?.role !== 'SuperAdmin'}
                            >
                              <option value="">No Dept</option>
                              {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                            </select>
                            <select 
                              value={user.subunitId || ''}
                              onChange={(e) => updateUserRole({ userId: user._id, subunitId: e.target.value as any || undefined, role: user.role as any })}
                              disabled={activeUser?.role !== 'SuperAdmin'}
                            >
                              <option value="">No Subunit</option>
                              {subunits.filter(s => !user.departmentId || s.departmentId === user.departmentId).map(s => (
                                <option key={s._id} value={s._id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            {statusFilter === 'active' ? (
                              <button 
                                className={styles.archiveBtn}
                                onClick={() => handleArchive(user._id)}
                                title="Archive User"
                              >
                                <Trash2 size={16} />
                              </button>
                            ) : (
                              <button 
                                className={styles.unarchiveBtn}
                                onClick={() => handleUnarchive(user._id)}
                              >
                                Restore
                              </button>
                            )}
                            <button className={styles.iconBtn}><ChevronRight size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className={styles.tabPane}>
            {myChurch ? (
              <AdminSettings church={myChurch as any} />
            ) : (
              <div className="flex justify-center p-12">
                <Loader2 className="animate-spin text-purple-600" />
              </div>
            )}
          </div>
        )}

        {activeTab === 'borrow' && (
          <div className={styles.tabPane}>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <Briefcase size={20} />
                <h2>Inter-Department Borrowing</h2>
              </div>
              <BorrowRequestForm />
            </section>
          </div>
        )}

        {activeTab === 'verifications' && (
          <div className={styles.tabPane}>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <ShieldCheck size={20} />
                <h2>Manual Verifications</h2>
              </div>
              <VerificationCenter />
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
