import React from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { RoleBadge } from '../components/RoleBadge';
import { InviteForm } from '../components/InviteForm';
import { RefreshCw, Trash2, Mail, Clock, CheckCircle, XCircle } from 'lucide-react';
import styles from './InviteManagement.module.css';

export const InviteManagement: React.FC = () => {
  const me = useQuery(api.users.me);
  const invites = useQuery(api.invites.getInvites);
  const revokeInvite = useMutation(api.invites.revokeInvite);
  const resendInvite = useMutation(api.invites.resendInvite);

  if (!me || (me.role !== 'SuperAdmin' && me.role !== 'DepartmentHead')) {
    return <div>Access Denied</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <InviteForm userRole={me.role as any} defaultDepartmentId={me.departmentId} />
      </div>

      <div className={styles.main}>
        <div className={styles.header}>
          <h2>Manage Invites</h2>
          <p>Track and manage pending invitations for your church.</p>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Dept / Subunit</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites?.map((invite: any) => (
                  <tr key={invite._id}>
                    <td>
                      <div className={styles.emailCell}>
                        <Mail size={14} />
                        {invite.email}
                      </div>
                    </td>
                    <td><RoleBadge role={invite.role as any} /></td>
                    <td>
                      <span className={styles.deptText}>
                        {invite.departmentName || '—'}
                        {invite.subunitName && ` / ${invite.subunitName}`}
                      </span>
                    </td>
                    <td>
                      <div className={`${styles.statusBadge} ${styles[invite.status]}`}>
                        {invite.status === 'pending' && <Clock size={12} />}
                        {invite.status === 'accepted' && <CheckCircle size={12} />}
                        {invite.status === 'revoked' && <XCircle size={12} />}
                        {invite.status === 'expired' && <Clock size={12} />}
                        {invite.status}
                      </div>
                    </td>
                    <td>{new Date(invite.expiresAt).toLocaleDateString()}</td>
                    <td>
                      <div className={styles.actions}>
                        {invite.status === 'pending' && (
                          <>
                            <button 
                              className={styles.iconBtn} 
                              title="Resend"
                              onClick={() => resendInvite({ inviteId: invite._id })}
                            >
                              <RefreshCw size={14} />
                            </button>
                            <button 
                              className={`${styles.iconBtn} ${styles.danger}`} 
                              title="Revoke"
                              onClick={() => revokeInvite({ inviteId: invite._id })}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {invites?.length === 0 && (
                  <tr>
                    <td colSpan={6} className={styles.empty}>No invites sent yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
