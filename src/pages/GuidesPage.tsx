import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Link } from 'react-router-dom';
import { 
  BookOpen, Search, ChevronDown, Calendar, 
  MapPin, Shield, Users, HelpCircle, ArrowRight 
} from 'lucide-react';
import styles from './GuidesPage.module.css';

interface GuideStep {
  text: string;
}

interface GuideTopic {
  id: string;
  title: string;
  scenario?: string;
  steps: GuideStep[];
  actionLink?: string;
  actionText?: string;
}

interface GuideCategory {
  title: string;
  icon: React.ReactNode;
  topics: GuideTopic[];
}

interface RoleGuides {
  [role: string]: {
    label: string;
    categories: GuideCategory[];
  };
}

export const GuidesPage: React.FC = () => {
  const me = useQuery(api.users.me);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Track open topic ID: "categoryIndex-topicIndex"
  const [openTopicId, setOpenTopicId] = useState<string | null>(null);
  
  // Refs for auto-scroll
  const topicRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const roleHierarchy = useMemo(() => {
    if (!me) return ['public'];
    const role = me.role || 'Volunteer';
    if (role === 'SuperAdmin') {
      return ['public', 'volunteer', 'subunit_lead', 'dept_head', 'dh_pastoral', 'super_admin'];
    }
    if (role === 'DeaconHead' || role === 'PastoralOversight') {
      return ['public', 'volunteer', 'subunit_lead', 'dept_head', 'dh_pastoral'];
    }
    if (role === 'DepartmentHead' || role === 'DepartmentAssistant' || role === 'DepartmentSecretary') {
      return ['public', 'volunteer', 'subunit_lead', 'dept_head'];
    }
    if (role === 'SubunitLead' || role === 'SubunitAssistant') {
      return ['public', 'volunteer', 'subunit_lead'];
    }
    return ['public', 'volunteer'];
  }, [me]);

  // Default active tab to user's highest role, otherwise 'public'
  const defaultTab = useMemo(() => {
    if (roleHierarchy.includes('super_admin')) return 'super_admin';
    if (roleHierarchy.includes('dh_pastoral')) return 'dh_pastoral';
    if (roleHierarchy.includes('dept_head')) return 'dept_head';
    if (roleHierarchy.includes('subunit_lead')) return 'subunit_lead';
    if (roleHierarchy.includes('volunteer')) return 'volunteer';
    return 'public';
  }, [roleHierarchy]);

  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  // Sync active tab once user profile loads
  React.useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const guidesData: RoleGuides = {
    public: {
      label: 'Onboarding & Guests',
      categories: [
        {
          title: 'Account & Access Setup',
          icon: <HelpCircle size={20} />,
          topics: [
            {
              id: 'pub-1',
              title: 'Requesting an Invitation to Join Katarly',
              scenario: 'I am a new church worker/steward and want to join my department on the app.',
              steps: [
                { text: 'Ask your Department Head or Subunit Lead to send you an invitation link from within the Katarly app.' },
                { text: 'Open the invitation link received via email or text.' },
                { text: 'Click the registration button to create your account using your Google, Microsoft, or email credentials.' },
                { text: 'Fill in your primary department details and submit the application for approval.' }
              ]
            },
            {
              id: 'pub-2',
              title: 'Installing the Katarly PWA on Mobile',
              scenario: 'I want to install Katarly as a native-like app on my home screen for easy access.',
              steps: [
                { text: 'Open the Katarly web application in your mobile browser (Safari for iOS, Chrome for Android).' },
                { text: 'For iOS: Tap the **Share** button at the bottom of Safari, scroll down, and select **Add to Home Screen**.' },
                { text: 'For Android: Tap the three-dot browser menu and select **Install App** or **Add to Home Screen**.' },
                { text: 'Launch Katarly directly from your phone screen to enjoy full mobile layout features and notifications.' }
              ]
            }
          ]
        }
      ]
    },
    volunteer: {
      label: 'Volunteer Guides',
      categories: [
        {
          title: 'Shift & Rota Management',
          icon: <Calendar size={20} />,
          topics: [
            {
              id: 'vol-1',
              title: 'Claiming Open Shifts from the Marketplace',
              scenario: 'I want to volunteer for an extra shift this week in my department.',
              steps: [
                { text: 'Navigate to the **Marketplace** page from the sidebar menu.' },
                { text: 'Browse the list of available open shifts. You will only see shifts that match your assigned departments or those toggled for cross-department volunteer help.' },
                { text: 'Tap **Claim Shift** on the shift card.' },
                { text: 'If the shift starts in less than 24 hours, you must accept a validation warning confirming your immediate commitment.' },
                { text: 'Once confirmed, the shift is locked and immediately displays in your **My Schedule** section.' }
              ],
              actionLink: '/marketplace',
              actionText: 'Go to Marketplace'
            },
            {
              id: 'vol-2',
              title: 'Dropping or Swapping an Assigned Shift',
              scenario: 'I am scheduled for a shift this Sunday but have an emergency and need to find a replacement.',
              steps: [
                { text: 'Navigate to **My Schedule** or the **Rota** page.' },
                { text: 'Locate your assigned shift and select **Drop / Request Swap**.' },
                { text: 'Choose to release it as an open shift or select another volunteer to request a direct swap.' },
                { text: 'If the shift begins in less than 24 hours, you will receive a prompt confirming the drop. *Warning*: Backend security locks shifts within 2 hours of starting, and they cannot be released.' }
              ],
              actionLink: '/my-schedule',
              actionText: 'View My Schedule'
            }
          ]
        },
        {
          title: 'Attendance & Check-in',
          icon: <MapPin size={20} />,
          topics: [
            {
              id: 'vol-3',
              title: 'On-site Geofence Check-in',
              scenario: 'I have arrived at the church venue and want to check-in physically.',
              steps: [
                { text: 'Ensure your device\'s location/GPS services are enabled and permissions are granted for Katarly.' },
                { text: 'Navigate to **Attendance Check-In** in the menu.' },
                { text: 'Scan the main physical QR code displayed on the venue screen.' },
                { text: 'The system validates your coordinates against the church\'s coordinate settings (must be within the 100m geofence radius).' },
                { text: 'A success message will confirm you have been marked **Present**.' }
              ],
              actionLink: '/attendance',
              actionText: 'Open Check-in Scanner'
            },
            {
              id: 'vol-4',
              title: 'Lodge a Personal QR Pass check-in',
              scenario: 'My phone\'s GPS coordinates are not resolving, and I need a subunit lead to scan me in.',
              steps: [
                { text: 'Tap the **QR Pass** icon at the top right of your mobile layout header.' },
                { text: 'An animated QR Code containing your temporary access pass will display.' },
                { text: 'Present this pass to any leader or supervisor with the scanning app.' },
                { text: 'Note: The pass rolls every 60 seconds for security. Keep the modal open until scanned.' }
              ]
            }
          ]
        }
      ]
    },
    subunit_lead: {
      label: 'Subunit Lead Guides',
      categories: [
        {
          title: 'Subunit Roster & Check-ins',
          icon: <Users size={20} />,
          topics: [
            {
              id: 'sub-1',
              title: 'Scanning Volunteer Passes on-site',
              scenario: 'A volunteer has arrived at the venue but has location issues. I need to scan their QR Pass.',
              steps: [
                { text: 'Open the menu drawer and select **Attendance Scanner**.' },
                { text: 'Point your camera at the volunteer\'s dynamic QR Pass modal screen.' },
                { text: 'Upon scanning, Katarly validates their identity, church membership, and security signature.' },
                { text: 'The check-in succeeds instantly, bypassing any GPS geofence restrictions on the volunteer\'s side.' }
              ],
              actionLink: '/attendance?scan=true',
              actionText: 'Launch Scanner'
            },
            {
              id: 'sub-2',
              title: 'Marking Shift Attendance Manually',
              scenario: 'I need to manually mark attendance for a team member who forgot their phone.',
              steps: [
                { text: 'Navigate to the **Service Management** page and select the active service card.' },
                { text: 'In the details panel, navigate to the **Roster & Attendance** tab.' },
                { text: 'Locate the volunteer\'s shift and click the three-dot action dropdown.' },
                { text: 'Select **Mark Attendance** and choose their status: **Present**, **Late**, or **Excused**.' }
              ],
              actionLink: '/service-management',
              actionText: 'Go to Services'
            }
          ]
        }
      ]
    },
    dept_head: {
      label: 'Department Head Guides',
      categories: [
        {
          title: 'Borrowing & Operations',
          icon: <Shield size={20} />,
          topics: [
            {
              id: 'dept-1',
              title: 'Borrowing Stewards from other Departments',
              scenario: 'My choir department is short on members for an upcoming service and I need to request help from another department.',
              steps: [
                { text: 'Open the menu drawer and select **People & Teams** (or Admin Panel).' },
                { text: 'Navigate to the **Borrowing** tab and click **Request Team Help**.' },
                { text: 'Select the department you wish to borrow from, target date range, and number of stewards needed.' },
                { text: 'Once the destination Department Head approves, their volunteers will display as candidates on your rota selection screen.' }
              ]
            },
            {
              id: 'dept-2',
              title: 'Departmental Rota Planning',
              scenario: 'I want to publish next month\'s team rotation schedule.',
              steps: [
                { text: 'Navigate to the **Rota** planner tab.' },
                { text: 'Select the date of the service and click **Add Steward**.' },
                { text: 'Assign volunteers to their respective tasks, roles, and formats (Physical vs Online).' },
                { text: 'Click **Publish Rota**. Stewards will receive email and dashboard alerts instantly.' }
              ],
              actionLink: '/rota',
              actionText: 'Open Rota Board'
            }
          ]
        }
      ]
    },
    dh_pastoral: {
      label: 'Oversight & Campus Leads',
      categories: [
        {
          title: 'Church-Wide Services & Audits',
          icon: <BookOpen size={20} />,
          topics: [
            {
              id: 'dh-1',
              title: 'Scheduling a Church-Wide Gathering/Service',
              scenario: 'I need to schedule next Sunday\'s physical service and add multiple occurrences.',
              steps: [
                { text: 'Open the menu drawer and choose **Service Management**.' },
                { text: 'Click the **Create Service** button at the top right.' },
                { text: 'Input the service name, start time, end time, and format (Physical, Online, or Hybrid).' },
                { text: 'In the **Multi-Date Occurrences** section, click **Add Date** to schedule recurring weeks in one transaction.' },
                { text: 'Select the QR security validation type (Generic or Dynamic Unique) and click **Create**.' }
              ],
              actionLink: '/service-management',
              actionText: 'Manage Services'
            },
            {
              id: 'dh-2',
              title: 'Auditing Global Attendance Analytics',
              scenario: 'I want to review the attendance summary and excuse rates for all departments.',
              steps: [
                { text: 'Open the sidebar menu and select **Reports & Analytics**.' },
                { text: 'Select the tab corresponding to the area you wish to audit (Services, Meetings, or Rotas).' },
                { text: 'Filter by date range or specific department scopes.' },
                { text: 'Review visual charts showing check-in completion, average lateness, and excuse filing rates.' }
              ],
              actionLink: '/reports',
              actionText: 'Open Analytics Hub'
            }
          ]
        }
      ]
    },
    super_admin: {
      label: 'System Admin Guides',
      categories: [
        {
          title: 'System Configurations & Geofences',
          icon: <Shield size={20} />,
          topics: [
            {
              id: 'admin-1',
              title: 'Updating Church Coordinates and Geofence Limits',
              scenario: 'Our church has moved, or we need to expand the GPS check-in radius from 100m to 150m.',
              steps: [
                { text: 'Open the sidebar menu and select **Church Settings**.' },
                { text: 'Locate the **Geofencing & Coordinates** section.' },
                { text: 'Enter the new Latitude and Longitude values.' },
                { text: 'Update the allowed **Geofence Radius** value (in meters).' },
                { text: 'Click **Save Changes**. The backend instantly updates check-in distance calculations.' }
              ]
            },
            {
              id: 'admin-2',
              title: 'Role Scoping & Database Adjustments',
              scenario: 'I need to promote a volunteer to Subunit Lead or reset their department assignments.',
              steps: [
                { text: 'Open the sidebar menu and select **Admin Panel**.' },
                { text: 'Navigate to the **User Management** tab.' },
                { text: 'Locate the user, select **Modify Role**, and choose the appropriate tier.' },
                { text: 'Verify their department assignments to ensure scope safety is maintained.' }
              ]
            }
          ]
        }
      ]
    }
  };

  const handleTopicToggle = (catIdx: number, topicIdx: number, topicId: string) => {
    const combinedId = `${catIdx}-${topicIdx}`;
    if (openTopicId === combinedId) {
      setOpenTopicId(null);
    } else {
      setOpenTopicId(combinedId);
      // Auto-scroll expanded item to top after rendering starts
      setTimeout(() => {
        const element = topicRefs.current[topicId];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  // Filter content based on keyword search
  const filteredCategories = useMemo(() => {
    const activeCategories = guidesData[activeTab]?.categories || [];
    if (!searchTerm) return activeCategories;

    const term = searchTerm.toLowerCase();
    return activeCategories.map(cat => {
      const filteredTopics = cat.topics.filter(topic => {
        return (
          topic.title.toLowerCase().includes(term) ||
          topic.scenario?.toLowerCase().includes(term) ||
          topic.steps.some(step => step.text.toLowerCase().includes(term))
        );
      });
      return { ...cat, topics: filteredTopics };
    }).filter(cat => cat.topics.length > 0);
  }, [activeTab, searchTerm]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Katarly Knowledge Hub</h1>
        <p>Dynamic user guides, step-by-step scenarios, and platform troubleshooting.</p>
      </header>

      {/* Sticky Search section */}
      <div className={styles.searchSection}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search guides (e.g. check-in, geofence, swap)..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Scoped Role Tabs */}
      <div className={styles.tabsContainer}>
        {roleHierarchy.map((roleKey) => {
          const tabMeta = guidesData[roleKey];
          if (!tabMeta) return null;
          return (
            <button
              key={roleKey}
              onClick={() => {
                setActiveTab(roleKey);
                setOpenTopicId(null);
              }}
              className={`${styles.tabBtn} ${activeTab === roleKey ? styles.activeTab : ''}`}
            >
              {tabMeta.label}
            </button>
          );
        })}
      </div>

      {/* Categories and Accordions */}
      {filteredCategories.length === 0 ? (
        <div className={styles.noResults}>
          <HelpCircle size={48} className={styles.noResultsIcon} />
          <h3>No matching guides found</h3>
          <p>Try refining your search keyword or selecting a different tab.</p>
        </div>
      ) : (
        <div className={styles.categoriesWrapper}>
          {filteredCategories.map((cat, catIdx) => (
            <div key={catIdx} className={styles.categoryCard}>
              <div className={styles.categoryHeader}>
                <span className={styles.categoryIcon}>{cat.icon}</span>
                <h2>{cat.title}</h2>
              </div>
              <div className={styles.topicsList}>
                {cat.topics.map((topic, topicIdx) => {
                  const combinedId = `${catIdx}-${topicIdx}`;
                  const isOpen = openTopicId === combinedId;
                  
                  return (
                    <div 
                      key={topic.id} 
                      ref={el => topicRefs.current[topic.id] = el}
                      className={styles.topicItem}
                    >
                      <button 
                        onClick={() => handleTopicToggle(catIdx, topicIdx, topic.id)}
                        className={styles.topicTrigger}
                      >
                        <span>{topic.title}</span>
                        <ChevronDown 
                          size={18} 
                          className={`${styles.chevronIcon} ${isOpen ? styles.openChevron : ''}`} 
                        />
                      </button>

                      <div 
                        className={styles.topicContent}
                        style={{ maxHeight: isOpen ? '1000px' : '0' }}
                      >
                        <div className={styles.topicContentInner}>
                          {topic.scenario && (
                            <div className={styles.scenarioBlock}>
                              <div className={styles.scenarioTitle}>Scenario</div>
                              <div className={styles.scenarioText}>"{topic.scenario}"</div>
                            </div>
                          )}

                          <div className={styles.stepsList}>
                            {topic.steps.map((step, stepIdx) => (
                              <div key={stepIdx} className={styles.stepItem}>
                                <span className={styles.stepNum}>{stepIdx + 1}</span>
                                <span className={styles.stepText}>{step.text}</span>
                              </div>
                            ))}
                          </div>

                          {topic.actionLink && (
                            <div className={styles.actionWrapper}>
                              <Link to={topic.actionLink} className={styles.actionBtn}>
                                {topic.actionText || 'Proceed'}
                                <ArrowRight size={14} />
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
