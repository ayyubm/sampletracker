import React, { useState, useEffect } from 'react';
import { getDocuments } from '../lib/firebase/firebaseUtils';

interface QCSummaryModalProps {
  sampleId: string;
  onClose: () => void;
}

interface Sample {
  sampleId: string;
  noOfPieces: number;
}

interface QCSummary {
  inspected: number;
  pass: number;
  alter: number;
  passAlter: number;
  reject: number;
  remark: string;
  qcName: string;
}

const QCSummaryModal: React.FC<QCSummaryModalProps> = ({ sampleId, onClose }) => {
  const [summary, setSummary] = useState<QCSummary>({
    inspected: 0,
    pass: 0,
    alter: 0,
    passAlter: 0,
    reject: 0,
    remark: '',
    qcName: ''
  });
  const [sampleData, setSampleData] = useState<Sample | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch QC data
        const outputs = await getDocuments('dailySamplingOutputs');
        const totalSummary = outputs.reduce((acc: QCSummary, doc: any) => {
          const sampleOutput = doc.outputs[sampleId];
          if (sampleOutput) {
            acc.inspected += sampleOutput.inspected || 0;
            acc.pass += sampleOutput.pass || 0;
            acc.alter += sampleOutput.alter || 0;
            acc.passAlter += sampleOutput.passAlter || 0;
            acc.reject += sampleOutput.reject || 0;
            
            // Keep the latest non-empty remarks and QC name
            if (sampleOutput.remark && sampleOutput.remark.trim()) {
              acc.remark = sampleOutput.remark;
            }
            if (sampleOutput.qcName && sampleOutput.qcName.trim()) {
              acc.qcName = sampleOutput.qcName;
            }
          }
          return acc;
        }, {
          inspected: 0,
          pass: 0,
          alter: 0,
          passAlter: 0,
          reject: 0,
          remark: '',
          qcName: ''
        });

        // Fetch sample data
        const samples = await getDocuments('samples') as Sample[];
        const sample = samples.find(s => s.sampleId === sampleId);
        if (sample) {
          setSampleData({
            sampleId: sample.sampleId,
            noOfPieces: sample.noOfPieces || 0
          });
        }

        setSummary(totalSummary);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching QC data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [sampleId]);

  const calculateQCRate = (value: number, total: number) => {
    if (!total) return '0';
    return ((value / total) * 100).toFixed(1);
  };

  const getQCEfficiency = () => {
    if (!summary.inspected) return '0';
    const totalPassed = summary.pass + summary.passAlter;
    return calculateQCRate(totalPassed, summary.inspected);
  };

  const getRejectionRate = () => {
    if (!summary.inspected) return '0';
    return calculateQCRate(summary.reject, summary.inspected);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="bg-white p-5 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            QC Summary - {sampleId}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            ×
          </button>
        </div>
        
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <>
            {summary.inspected === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-gray-500">No QC data available for this sample</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <span className="font-medium text-gray-600">Inspected:</span>
                    <span className="text-lg font-bold text-blue-600">{summary.inspected}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span className="font-medium text-gray-600">Pass:</span>
                    <span className="text-lg font-bold text-green-600">{summary.pass}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                    <span className="font-medium text-gray-600">Alter:</span>
                    <span className="text-lg font-bold text-yellow-600">{summary.alter}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <span className="font-medium text-gray-600">Pass After Alter:</span>
                    <span className="text-lg font-bold text-blue-600">{summary.passAlter}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                    <span className="font-medium text-gray-600">Reject:</span>
                    <span className="text-lg font-bold text-red-600">{summary.reject}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 mb-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-700 mb-2">QC Efficiency</h4>
                    <span className="text-2xl font-bold text-green-600">
                      {getQCEfficiency()}%
                    </span>
                    <span className="text-sm text-green-600 block">Pass Rate</span>
                  </div>
                  
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <h4 className="font-medium text-red-700 mb-2">Rejection Rate</h4>
                    <span className="text-2xl font-bold text-red-600">
                      {getRejectionRate()}%
                    </span>
                    <span className="text-sm text-red-600 block">Defect Rate</span>
                  </div>
                </div>

                {(summary.qcName || summary.remark) && (
                  <div className="pt-4 border-t border-gray-200">
                    {summary.qcName && (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-600">QC Inspector: </span>
                        <span className="text-sm text-gray-800">{summary.qcName}</span>
                      </div>
                    )}
                    {summary.remark && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Latest Remark: </span>
                        <span className="text-sm text-gray-800">{summary.remark}</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default QCSummaryModal; 