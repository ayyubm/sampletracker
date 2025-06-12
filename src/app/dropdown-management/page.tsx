'use client';

import React, { useState, useEffect } from 'react';
import { Menu, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  SAMPLE_TYPE_OPTIONS,
  STATUS_OPTIONS,
  SEASON_OPTIONS,
  PATTERN_STATUS_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
  FABRIC_CATEGORY_OPTIONS
} from '../../lib/constants';

interface DropdownOption {
  id: string;
  value: string;
  isEditing?: boolean;
}

interface DropdownSection {
  key: string;
  title: string;
  options: DropdownOption[];
}

const DropdownManagement: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dropdownSections, setDropdownSections] = useState<DropdownSection[]>([]);
  const [newValues, setNewValues] = useState<{ [key: string]: string }>({});
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ sectionKey: string; optionId: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!userData || !userData.isAdmin) {
        router.push('/'); // Redirect non-admin users to the home page
      } else {
        initializeDropdownSections();
      }
    }
  }, [userData, loading, router]);

  const initializeDropdownSections = () => {
    const sections: DropdownSection[] = [
      {
        key: 'sampleTypes',
        title: 'Sample Types',
        options: SAMPLE_TYPE_OPTIONS.map((option, index) => ({
          id: `sample_${index}`,
          value: option
        }))
      },
      {
        key: 'status',
        title: 'Status Options',
        options: STATUS_OPTIONS.map((option, index) => ({
          id: `status_${index}`,
          value: option
        }))
      },
      {
        key: 'seasons',
        title: 'Season Options',
        options: SEASON_OPTIONS.map((option, index) => ({
          id: `season_${index}`,
          value: option
        }))
      },
      {
        key: 'patternStatus',
        title: 'Pattern Status Options',
        options: PATTERN_STATUS_OPTIONS.map((option, index) => ({
          id: `pattern_${index}`,
          value: option
        }))
      },
      {
        key: 'productCategory',
        title: 'Product Category Options',
        options: PRODUCT_CATEGORY_OPTIONS.map((option, index) => ({
          id: `product_${index}`,
          value: option
        }))
      },
      {
        key: 'fabricCategory',
        title: 'Fabric Category Options',
        options: FABRIC_CATEGORY_OPTIONS.map((option, index) => ({
          id: `fabric_${index}`,
          value: option
        }))
      }
    ];
    setDropdownSections(sections);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleAddOption = (sectionKey: string) => {
    const newValue = newValues[sectionKey]?.trim();
    if (!newValue) return;

    setDropdownSections(prevSections =>
      prevSections.map(section => {
        if (section.key === sectionKey) {
          const newId = `${sectionKey}_${Date.now()}`;
          return {
            ...section,
            options: [...section.options, { id: newId, value: newValue }]
          };
        }
        return section;
      })
    );

    setNewValues(prev => ({ ...prev, [sectionKey]: '' }));
  };

  const handleEditOption = (sectionKey: string, optionId: string) => {
    setDropdownSections(prevSections =>
      prevSections.map(section => {
        if (section.key === sectionKey) {
          return {
            ...section,
            options: section.options.map(option =>
              option.id === optionId ? { ...option, isEditing: true } : option
            )
          };
        }
        return section;
      })
    );
  };

  const handleSaveOption = (sectionKey: string, optionId: string, newValue: string) => {
    if (!newValue.trim()) return;

    setDropdownSections(prevSections =>
      prevSections.map(section => {
        if (section.key === sectionKey) {
          return {
            ...section,
            options: section.options.map(option =>
              option.id === optionId 
                ? { ...option, value: newValue.trim(), isEditing: false }
                : option
            )
          };
        }
        return section;
      })
    );
  };

  const handleCancelEdit = (sectionKey: string, optionId: string) => {
    setDropdownSections(prevSections =>
      prevSections.map(section => {
        if (section.key === sectionKey) {
          return {
            ...section,
            options: section.options.map(option =>
              option.id === optionId ? { ...option, isEditing: false } : option
            )
          };
        }
        return section;
      })
    );
  };

  const handleDeleteOption = (sectionKey: string, optionId: string) => {
    setDeleteConfirmation({ sectionKey, optionId });
  };

  const confirmDelete = () => {
    if (!deleteConfirmation) return;

    const { sectionKey, optionId } = deleteConfirmation;
    setDropdownSections(prevSections =>
      prevSections.map(section => {
        if (section.key === sectionKey) {
          return {
            ...section,
            options: section.options.filter(option => option.id !== optionId)
          };
        }
        return section;
      })
    );
    setDeleteConfirmation(null);
  };

  const cancelDelete = () => {
    setDeleteConfirmation(null);
  };

  const saveChangesToFile = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const constants = {
        sampleTypes: dropdownSections.find(s => s.key === 'sampleTypes')?.options.map(o => o.value) || [],
        status: dropdownSections.find(s => s.key === 'status')?.options.map(o => o.value) || [],
        seasons: dropdownSections.find(s => s.key === 'seasons')?.options.map(o => o.value) || [],
        patternStatus: dropdownSections.find(s => s.key === 'patternStatus')?.options.map(o => o.value) || [],
        productCategory: dropdownSections.find(s => s.key === 'productCategory')?.options.map(o => o.value) || [],
        fabricCategory: dropdownSections.find(s => s.key === 'fabricCategory')?.options.map(o => o.value) || []
      };

      const response = await fetch('/api/update-constants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          constants,
          userToken: userData?.email // Send user email for verification
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSaveMessage({ type: 'success', text: 'Dropdown values updated successfully! The changes will be available after refreshing any pages that use these dropdowns.' });
        // Auto-hide success message after 5 seconds
        setTimeout(() => setSaveMessage(null), 5000);
      } else {
        throw new Error(result.error || 'Failed to update constants');
      }
    } catch (error) {
      console.error('Error saving constants:', error);
      setSaveMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to save changes. Please try again.' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!userData || !userData.isAdmin) {
    return null; // This will prevent the component from rendering while redirecting
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <button onClick={toggleSidebar} className="mr-4">
              <Menu size={24} />
            </button>
            <h1 className="text-2xl font-bold">Dropdown Management</h1>
          </div>
          <button
            onClick={saveChangesToFile}
            disabled={isSaving}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Success/Error Message */}
        {saveMessage && (
          <div className={`mb-4 p-4 rounded-lg ${
            saveMessage.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {saveMessage.text}
          </div>
        )}

        <div className="grid gap-6">
          {dropdownSections.map((section) => (
            <div key={section.key} className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
              
              {/* Add new option */}
              <div className="mb-4 flex items-center space-x-2">
                <input
                  type="text"
                  value={newValues[section.key] || ''}
                  onChange={(e) => setNewValues(prev => ({ ...prev, [section.key]: e.target.value }))}
                  placeholder={`Add new ${section.title.toLowerCase()}`}
                  className="border p-2 flex-grow rounded"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddOption(section.key);
                    }
                  }}
                />
                <button
                  onClick={() => handleAddOption(section.key)}
                  className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 flex items-center"
                >
                  <Plus size={16} className="mr-1" />
                  Add
                </button>
              </div>

              {/* Options list */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {section.options.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                    {option.isEditing ? (
                      <EditingOptionRow
                        option={option}
                        onSave={(newValue) => handleSaveOption(section.key, option.id, newValue)}
                        onCancel={() => handleCancelEdit(section.key, option.id)}
                      />
                    ) : (
                      <>
                        <span className="flex-grow">{option.value}</span>
                        <button
                          onClick={() => handleEditOption(section.key, option.id)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteOption(section.key, option.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Delete confirmation modal */}
        {deleteConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl">
              <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
              <p className="mb-4">Are you sure you want to delete this option?</p>
              <div className="flex space-x-2">
                <button
                  onClick={confirmDelete}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Delete
                </button>
                <button
                  onClick={cancelDelete}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface EditingOptionRowProps {
  option: DropdownOption;
  onSave: (newValue: string) => void;
  onCancel: () => void;
}

const EditingOptionRow: React.FC<EditingOptionRowProps> = ({ option, onSave, onCancel }) => {
  const [editValue, setEditValue] = useState(option.value);

  const handleSave = () => {
    onSave(editValue);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <>
      <input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyPress={handleKeyPress}
        className="flex-grow p-1 border rounded"
        autoFocus
      />
      <button
        onClick={handleSave}
        className="text-green-600 hover:text-green-800 p-1"
      >
        <Save size={16} />
      </button>
      <button
        onClick={onCancel}
        className="text-gray-600 hover:text-gray-800 p-1"
      >
        <X size={16} />
      </button>
    </>
  );
};

export default DropdownManagement; 