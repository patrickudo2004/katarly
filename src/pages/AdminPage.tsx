import React, { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Organogram } from '../components/Organogram';
import { AdminSettings } from '../components/AdminSettings';
import { BorrowRequestForm } from '../components/BorrowRequestForm';
import { BorrowApprovalPanel } from '../components/BorrowApprovalPanel';
import { BorrowAssignmentCard } from '../components/BorrowAssignmentCard';
import { VerificationCenter } from '../components/VerificationCenter';
import { Users, Mail, Settings, Shield, Loader2, Plus, Trash2, UserCog, ChevronRight, Building2, Briefcase, ShieldCheck, Search, Award, ArrowRightLeft } from 'lucide-react';
import { ProbationManager } from '../components/ProbationManager';
import styles from './AdminPage.module.css';

export const AdminPage: React.FC = () => {
  const activeUser = useQuery(api.users.me);
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'users' | 'probations' | 'settings' | 'borrow' | 'verifications'>('hierarchy');
  const [hasDefaultedTab, setHasDefaultedTab] = useState(false);

  React.useEffect(() => {
    if (activeUser && !hasDefaultedTab) {
      const isGlobal = activeUser.role === 'SuperAdmin' || activeUser.role === 'DeaconHead';
      if (!isGlobal) {
        setActiveTab('borrow');
      }
      setHasDefaultedTab(true);
    }
  }, [activeUser, hasDefaultedTab]);
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
  const [newDeptRequiresSafeguarding, setNewDeptRequiresSafeguarding] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editingDeptName, setEditingDeptName] = useState('');
  const [editingDeptRequiresSafeguarding, setEditingDeptRequiresSafeguarding] = useState(false);

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

  const handleToggleSkill = async (user: any, skill: string, checked: boolean) => {
    const currentSkills = user.skills || [];
    let newSkills;
    if (checked) {
      newSkills = [...currentSkills.filter((s: string) => s !== skill), skill];
    } else {
      newSkills = currentSkills.filter((s: string) => s !== skill);
    }
    try {
      await updateUserRole({
        userId: user._id,
        role: user.role || "Volunteer",
        departmentId: user.departmentId,
        subunitId: user.subunitId,
        skills: newSkills
      });
    } catch (err: any) {
      alert("Failed to update safeguarding status: " + (err.message || err));
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
      await createDept({ 
        name: newDeptName,
        requiresSafeguarding: newDeptRequiresSafeguarding
      });
      setNewDeptName('');
      setNewDeptRequiresSafeguarding(false);
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
      await updateDept({ 
        id: editingDeptId as any, 
        name: editingDeptName,
        requiresSafeguarding: editingDeptRequiresSafeguarding
      });
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

  if (activeUser === undefined || organogramData === undefined || subunits === undefined || users === undefined || departments === undefined) {
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
          {(activeUser?.role === 'SuperAdmin' || activeUser?.role === 'DeaconHead') && (
            <>
              <button className={activeTab === 'hierarchy' ? styles.activeTab : ''} onClick={() => setActiveTab('hierarchy')}>Hierarchy</button>
              <button className={activeTab === 'users' ? styles.activeTab : ''} onClick={() => setActiveTab('users')}>Users</button>
              <button className={activeTab === 'verifications' ? styles.activeTab : ''} onClick={() => setActiveTab('verifications')}>Verifications</button>
            </>
          )}
          {['SuperAdmin', 'DeaconHead', 'DepartmentHead', 'DepartmentAssistant', 'DepartmentSecretary', 'SubunitLead', 'SubunitAssistant'].includes(activeUser?.role || '') && (
            <button className={activeTab === 'borrow' ? styles.activeTab : ''} onClick={() => setActiveTab('borrow')}>Borrow Teams</button>
          )}
          {activeUser?.role === 'SuperAdmin' && (
            <button className={activeTab === 'settings' ? styles.activeTab : ''} onClick={() => setActiveTab('settings')}>Settings</button>
          )}
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
                <form onSubmit={handleCreateDept} className={styles.inlineForm} style={{ flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '1rem', width: '100%', alignItems: 'center' }}>
                    <input placeholder="Dept Name" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} required style={{ flex: 1 }} />
                    <button type="submit" className={styles.saveBtn} style={{ marginTop: 0 }}>Save</button>
                    <button type="button" onClick={() => setIsAddingDept(false)} className={styles.cancelBtn}>Cancel</button>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={newDeptRequiresSafeguarding}
                      onChange={e => setNewDeptRequiresSafeguarding(e.target.checked)}
                    />
                    <span style={{ color: 'var(--text-primary)' }}>Requires Safeguarding Clearance</span>
                  </label>
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
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', marginTop: '0.5rem', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={editingDeptRequiresSafeguarding}
                              onChange={e => setEditingDeptRequiresSafeguarding(e.target.checked)}
                            />
                            <span style={{ color: 'var(--text-primary)' }}>Requires Safeguarding Clearance</span>
                          </label>
                          <div className={styles.editActions} style={{ marginTop: '0.5rem' }}>
                            <button type="submit" className={styles.saveBtn}>Save</button>
                            <button type="button" onClick={() => setEditingDeptId(null)} className={styles.cancelBtn}>Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <div className={styles.nameRow}>
                          <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {dept.name}
                            {dept.requiresSafeguarding && (
                              <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '0.1rem 0.4rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>High Risk</span>
                            )}
                          </strong>
                          {activeUser?.role === 'SuperAdmin' && (
                            <button 
                              className={styles.editIconBtn}
                              onClick={() => {
                                setEditingDeptId(dept._id);
                                setEditingDeptName(dept.name);
                                setEditingDeptRequiresSafeguarding(dept.requiresSafeguarding ?? false);
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
                      <th>Safeguarding & Background Check</th>
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
                              onChange={(e) => {
                                const newDeptId = e.target.value;
                                const newSubunitId = user.subunitId && subunits.find(s => s._id === user.subunitId)?.departmentId === newDeptId 
                                  ? user.subunitId 
                                  : undefined;
                                updateUserRole({ 
                                  userId: user._id, 
                                  departmentId: newDeptId as any || undefined, 
                                  subunitId: newSubunitId as any || undefined,
                                  role: user.role as any 
                                });
                              }}
                              disabled={activeUser?.role !== 'SuperAdmin'}
                            >
                              <option value="">No Dept</option>
                              {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                            </select>
                            <select 
                              value={user.subunitId || ''}
                              onChange={(e) => updateUserRole({ 
                                userId: user._id, 
                                departmentId: user.departmentId as any || undefined, 
                                subunitId: e.target.value as any || undefined, 
                                role: user.role as any 
                              })}
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                              <input 
                                type="checkbox"
                                checked={user.skills?.includes("Safeguarding Approved") ?? false}
                                onChange={(e) => handleToggleSkill(user, "Safeguarding Approved", e.target.checked)}
                                disabled={activeUser?.role !== 'SuperAdmin'}
                              />
                              <span style={{ color: 'var(--text-primary)' }}>Safeguarding Approved</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                              <input 
                                type="checkbox"
                                checked={user.skills?.includes("Background Checked") ?? false}
                                onChange={(e) => handleToggleSkill(user, "Background Checked", e.target.checked)}
                                disabled={activeUser?.role !== 'SuperAdmin'}
                              />
                              <span style={{ color: 'var(--text-primary)' }}>Background Checked</span>
                            </label>
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
            {/* Send a request */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <Briefcase size={20} />
                <h2>Request Team Help</h2>
              </div>
              <BorrowRequestForm />
            </section>

            {/* Incoming requests to approve */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <ArrowRightLeft size={20} />
                <h2>Incoming Requests</h2>
              </div>
              <BorrowApprovalPanel />
            </section>

            {/* Volunteer's own pending assignments */}
            <section className={styles.section}>
              <BorrowAssignmentCard />
            </section>

            {/* SuperAdmin: see all church-wide activity */}
            {(activeUser?.role === 'SuperAdmin' || activeUser?.role === 'DeaconHead') && (
              <AllBorrowActivity />
            )}
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
        {activeTab === 'probations' && (
          <div className={styles.tabPane}>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <Award size={20} />
                <h2>Probation Monitoring Quest</h2>
              </div>
              <ProbationManager churchId={activeUser?.churchId} />
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

// SuperAdmin-only: table of ALL borrow requests across the church
const AllBorrowActivity: React.FC = () => {
  const all = useQuery(api.borrow.getActiveBorrowRequests);
  if (!all || all.length === 0) return null;

  const statusColor: Record<string, string> = {
    pending: '#854d0e',
    approved: '#1d4ed8',
    declined: '#dc2626',
    expired: '#6b7280',
  };
  const statusBg: Record<string, string> = {
    pending: '#fef9c3',
    approved: '#dbeafe',
    declined: '#fef2f2',
    expired: '#f3f4f6',
  };

  return (
    <section style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <ArrowRightLeft size={20} />
        <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>All Borrow Activity</h2>
      </div>
      <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              {['Type', 'From', 'To', 'Role', 'Count', 'Dates', 'Status'].map((h) => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {all.map((r: any) => (
              <tr key={r._id} style={{ borderTop: '1px solid var(--border-color)' }}>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: r.borrowType === 'intra_dept' ? '#dbeafe' : '#ede9fe', color: r.borrowType === 'intra_dept' ? '#1d4ed8' : '#7c3aed' }}>
                    {r.borrowType === 'intra_dept' ? 'Intra' : 'Inter'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-primary)' }}>
                  {r.requestingDeptName}{r.requestingSubunitName ? ` › ${r.requestingSubunitName}` : ''}
                </td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-primary)' }}>
                  {r.targetDeptName}{r.targetSubunitName ? ` › ${r.targetSubunitName}` : ''}
                </td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{r.role}</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', textAlign: 'center' }}>{r.count}</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: statusBg[r.status] ?? '#f3f4f6', color: statusColor[r.status] ?? '#6b7280' }}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
