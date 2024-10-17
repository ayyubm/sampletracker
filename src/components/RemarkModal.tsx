import React, { useState, useEffect } from 'react';
import { getDocument, updateDocument } from '../lib/firebase/firebaseUtils';
import { useAuth } from '../lib/hooks/useAuth';

interface RemarkModalProps {
  sampleId: string;
  onClose: () => void;
  onRemarkAdded: () => void;
}

export default function RemarkModal({ sampleId, onClose, onRemarkAdded }: RemarkModalProps) {
  const [sample, setSample] = useState<any>(null);
  const [newRemark, setNewRemark] = useState('');
  const { userData } = useAuth();

  useEffect(() => {
    const fetchSample = async () => {
      const fetchedSample = await getDocument('samples', sampleId);
      setSample(fetchedSample);
    };
    fetchSample();
  }, [sampleId]);

  const handleAddRemark = async () => {
    if (!newRemark.trim() || !userData) return;

    const remark = {
      text: newRemark.trim(),
      timestamp: new Date().toISOString(),
      user: userData.firstName,
    };

    const updatedRemarks = [...(sample.remarks || []), remark];
    await updateDocument('samples', sampleId, { remarks: updatedRemarks });
    onRemarkAdded();
    setNewRemark('');
    setSample({ ...sample, remarks: updatedRemarks });
  };

  if (!sample) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Remarks for Sample {sample.sampleId}</h3>
        <div className="max-h-60 overflow-y-auto mb-4">
          {sample.remarks && sample.remarks.length > 0 ? (
            sample.remarks.map((remark: any, index: number) => (
              <div key={index} className="mb-2 p-2 bg-gray-100 rounded">
                <p className="text-sm">{remark.text}</p>
                <p className="text-xs text-gray-500">
                  By {remark.user} on {new Date(remark.timestamp).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No remarks yet.</p>
          )}
        </div>
        <textarea
          value={newRemark}
          onChange={(e) => setNewRemark(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          placeholder="Add a new remark..."
          rows={3}
        />
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Close
          </button>
          <button
            onClick={handleAddRemark}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Add Remark
          </button>
        </div>
      </div>
    </div>
  );
}
