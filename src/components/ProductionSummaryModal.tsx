import React, { useEffect, useState } from 'react';
import { getDocuments, getDocument } from '../lib/firebase/firebaseUtils';
import { BarChart } from 'lucide-react';

interface Sample {
  sampleId: string;
  requiredFabricQty: number;
  totalFabricQtyRecieved: number;
  noOfPieces: number;
  balanceLeftoverFabric: number;
  fabricCategory: string;
}

interface ProductionSummary {
  CUT: number;
  SEW: number;
  FINISH: number;
}

interface ProductionSummaryModalProps {
  sampleId: string;
  onClose: () => void;
}

const ProductionSummaryModal: React.FC<ProductionSummaryModalProps> = ({ sampleId, onClose }) => {
  const [summary, setSummary] = useState<ProductionSummary>({
    CUT: 0,
    SEW: 0,
    FINISH: 0
  });
  const [sampleData, setSampleData] = useState<Sample | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch production data
        const outputs = await getDocuments('dailySamplingOutputs');
        const totalSummary = outputs.reduce((acc: ProductionSummary, doc: any) => {
          const sampleOutput = doc.outputs[sampleId];
          if (sampleOutput) {
            acc.CUT += sampleOutput.CUT || 0;
            acc.SEW += sampleOutput.SEW || 0;
            acc.FINISH += sampleOutput.FINISH || 0;
          }
          return acc;
        }, {
          CUT: 0,
          SEW: 0,
          FINISH: 0
        });

        // Fetch sample data
        const samples = await getDocuments('samples') as Sample[];
        const sample = samples.find(s => s.sampleId === sampleId);
        if (sample) {
          setSampleData({
            sampleId: sample.sampleId,
            requiredFabricQty: sample.requiredFabricQty || 0,
            totalFabricQtyRecieved: sample.totalFabricQtyRecieved || 0,
            noOfPieces: sample.noOfPieces || 0,
            balanceLeftoverFabric: sample.balanceLeftoverFabric || 0,
            fabricCategory: sample.fabricCategory || ''
          });
        }

        setSummary(totalSummary);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [sampleId]);

  const calculateApprovedConsumption = () => {
    if (!sampleData?.noOfPieces || !sampleData?.requiredFabricQty) return 0;
    return (sampleData.requiredFabricQty / sampleData.noOfPieces).toFixed(2);
  };

  const calculateActualConsumption = () => {
    let balFab = 0;
    if (!sampleData?.balanceLeftoverFabric) {
      balFab = 0;
    } else {
      balFab = sampleData.balanceLeftoverFabric;
    }
    if (!summary.SEW || !sampleData?.totalFabricQtyRecieved) return 0;
    return ((sampleData.totalFabricQtyRecieved - balFab) / summary.SEW).toFixed(2);
  };

  const getConsumptionUnit = () => {
    if (!sampleData?.fabricCategory) return 'meters/piece';
    return sampleData.fabricCategory === 'Knit' ? 'grams/piece' : 'meters/piece';
  };

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
          <>
            <div className="space-y-3 mb-6">
              {Object.entries(summary).map(([stage, count]) => (
                <div key={stage} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="font-medium text-gray-600">{stage}:</span>
                  <span className="text-lg font-bold text-blue-600">{count}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-700 mb-2">Approved Consumption</h4>
                <span className="text-2xl font-bold text-green-600">
                  {calculateApprovedConsumption()}
                </span>
                <span className="text-sm text-green-600 block">{getConsumptionUnit()}</span>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-700 mb-2">Actual Consumption</h4>
                <span className="text-2xl font-bold text-purple-600">
                  {calculateActualConsumption()}
                </span>
                <span className="text-sm text-purple-600 block">{getConsumptionUnit()}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductionSummaryModal; 