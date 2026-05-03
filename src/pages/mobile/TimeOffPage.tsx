import React, { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Calendar, Clock, Send, ChevronLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import styles from './mobile.module.css';

export const TimeOffPage: React.FC = () => {
  const navigate = useNavigate();
  const requests = useQuery(api.timeOff.getRequests);
  const createRequest = useMutation(api.timeOff.createRequest);
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) {
      setError("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await createRequest({
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
        reason
      });
      setSuccess(true);
      setStartDate("");
      setEndDate("");
      setReason("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (requests === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className="flex items-center gap-4 p-4 sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Request Time Off</h1>
      </header>

      <section className={styles.section}>
        <div className={styles.card}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 text-green-600 rounded-lg flex items-center gap-2 text-sm">
                <CheckCircle2 size={16} />
                Request submitted successfully!
              </div>
            )}
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Start Date</label>
              <input 
                type="date" 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500 transition-colors"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">End Date</label>
              <input 
                type="date" 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500 transition-colors"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Reason</label>
              <textarea 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500 transition-colors min-h-[100px]"
                placeholder="Briefly explain why you need time off..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-200 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              Submit Request
            </button>
          </form>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Your Requests</h2>
        </div>
        <div className={styles.list}>
          {requests.length === 0 ? (
            <div className={styles.emptyState}>No time off requests found.</div>
          ) : (
            requests.map((req: any) => (
              <div key={req._id} className={styles.listItem}>
                <div className={styles.itemIcon}>
                  <Clock size={20} />
                </div>
                <div className={styles.itemInfo}>
                  <p className={styles.itemTitle}>{req.reason}</p>
                  <p className={styles.itemSubtitle}>
                    {format(req.startDate, 'MMM d')} - {format(req.endDate, 'MMM d, yyyy')}
                  </p>
                </div>
                <div className={styles.badge} style={{ 
                  background: req.status === 'Approved' ? '#dcfce7' : req.status === 'Rejected' ? '#fee2e2' : '#fef9c3', 
                  color: req.status === 'Approved' ? '#15803d' : req.status === 'Rejected' ? '#991b1b' : '#a16207' 
                }}>
                  {req.status}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
