import React, { useState } from 'react';
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Send, Users, Loader2 } from 'lucide-react';
import styles from './InviteForm.module.css';

interface InviteFormProps {
  userRole: 'SuperAdmin' | 'DepartmentHead';
  defaultDepartmentId?: string;
}

export const InviteForm: React.FC<InviteFormProps> = ({ userRole, defaultDepartmentId }) => {
  const bulkInvite = useMutation(api.invites.bulkInvite);
  const departments = useQuery(api.departments.getDepartments);
  const subunits = useQuery(api.subunits.getSubunits);
  
  const [emailsText, setEmailsText] = useState('');
  const [role, setRole] = useState('Volunteer');
  const [selectedDeptId, setSelectedDeptId] = useState(defaultDepartmentId || '');
  const [selectedSubunitId, setSelectedSubunitId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const availableSubunits = subunits?.filter(s => s.departmentId === selectedDeptId) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const emails = emailsText
      .split(/[\s,]+/)
      .map(e => e.trim())
      .filter(e => e.includes('@'));

    try {
      await bulkInvite({
        emails,
        role,
        departmentId: selectedDeptId || undefined as any,
        subunitId: selectedSubunitId || undefined as any,
      });
      setSuccess(true);
      setEmailsText('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error(error);
      alert("Failed to send invites. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.iconBox}>
          <Users size={24} />
        </div>
        <div>
          <h3>Invite Team Members</h3>
          <p>Add people to your team.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label>Email Addresses</label>
          <textarea 
            placeholder="Paste emails separated by commas or spaces..."
            value={emailsText}
            onChange={(e) => setEmailsText(e.target.value)}
            required
            rows={4}
          />
          <span className={styles.hint}>Tip: You can paste a list from Excel or Google Sheets.</span>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label>Assign Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="Volunteer">Volunteer</option>
              <option value="Probation">Probation</option>
              <option value="SubunitLead">Subunit Lead</option>
              <option value="SubunitAssistant">Subunit Assistant</option>
              
              {userRole === 'SuperAdmin' && (
                <>
                  <option value="DepartmentHead">Department Head</option>
                  <option value="DepartmentAssistant">Department Assistant</option>
                  <option value="PastoralOversight">Pastoral Oversight</option>
                  <option value="DeaconHead">Deacon Head</option>
                </>
              )}
            </select>
          </div>

          <div className={styles.field}>
            <label>Department</label>
            <select 
              value={selectedDeptId} 
              onChange={(e) => {
                setSelectedDeptId(e.target.value);
                setSelectedSubunitId('');
              }} 
              required
            >
              <option value="">Select Department...</option>
              {departments?.map(d => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>

          {availableSubunits.length > 0 && (
            <div className={styles.field}>
              <label>Subunit</label>
              <select 
                value={selectedSubunitId} 
                onChange={(e) => setSelectedSubunitId(e.target.value)}
              >
                <option value="">Select Subunit (Optional)...</option>
                {availableSubunits.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button type="submit" className={styles.submitBtn} disabled={isSubmitting || !emailsText || !selectedDeptId}>
          {isSubmitting ? <Loader2 className={styles.spinner} /> : (
            <>{success ? "Invites Sent!" : "Send Invites"} <Send size={18} /></>
          )}
        </button>
      </form>
    </div>
  );
};
