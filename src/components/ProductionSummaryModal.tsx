import React, { useEffect, useState } from 'react';
import { getDocuments } from '../lib/firebase/firebaseUtils';
import { BarChart } from 'lucide-react';

interface ProductionSummary {
  CUT: number;
  SEW: number;
  FINISH: number;
  ALTER: number;
  PASS: number;
  REJECT: number;
}

interface ProductionSummaryModalProps {
  sampleId: string;
  onClose: () => void;
}

const ProductionSummaryModal: React.FC<ProductionSummaryModalProps> = ({ sampleId, onClose }) => {
  const [summary, setSummary] = useState<ProductionSummary>({
    CUT: 0,
    SEW: 0,
    FINISH: 0,
    ALTER: 0,
    PASS: 0,
    REJECT: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProductionData = async () => {
      try {
        const outputs = await getDocuments('dailySamplingOutputs');
        const totalSummary = outputs.reduce((acc: ProductionSummary, doc: any) => {
          const sampleOutput = doc.outputs[sampleId];
          if (sampleOutput) {
            acc.CUT += sampleOutput.CUT || 0;
            acc.SEW += sampleOutput.SEW || 0;
            acc.FINISH += sampleOutput.FINISH || 0;
            acc.ALTER += sampleOutput.ALTER || 0;
            acc.PASS += sampleOutput.PASS || 0;
            acc.REJECT += sampleOutput.REJECT || 0;
          }
          return acc;
        }, {
          CUT: 0,
          SEW: 0,
          FINISH: 0,
          ALTER: 0,
          PASS: 0,
          REJECT: 0
        });

        setSummary(totalSummary);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching production data:', error);
        setLoading(false);
      }
    };

    fetchProductionData();
  }, [sampleId]);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="bg-white p-5 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Production Summary
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
          <div className="space-y-3">
            {Object.entries(summary).map(([stage, count]) => (
              <div key={stage} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="font-medium text-gray-600">{stage}:</span>
                <span className="text-lg font-bold text-blue-600">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductionSummaryModal; 