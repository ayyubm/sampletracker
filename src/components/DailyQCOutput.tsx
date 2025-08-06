'use client';

import { useState, useEffect } from 'react';
import { getDocuments, addDocument, updateDocument } from '../lib/firebase/firebaseUtils';
import { format } from 'date-fns';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { Button } from './ui/button';
import Alert from './Alert';
import { useAuth } from '../lib/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface Buyer {
  id: string;
  buyerId: string;
  name: string;
}

interface Sample {
  id: string;
  sampleId: string;
  buyerId: string;
  style: string;
  color: string;
  typeOfSample: string;
  fabricTrimsReceiptDate: string;
  status: string;
  noOfPieces: number;
  isArchived: boolean;
  fabricCategory: string;
  totalFabricQtyRecieved?: number;
  changeTracking?: {
    archived?: {
      timestamp: string;
      name: string;
    };
  };
}

interface QCOutput {
  inspected: number;
  pass: number;
  alter: number;
  passAlter: number;
  reject: number;
  remark: string;
  qcName: string;
}

interface SampleQCOutput {
  sampleId: string;
  inspected: number;
  pass: number;
  alter: number;
  passAlter: number;
  reject: number;
  remark: string;
  qcName: string;
}

interface GroupedSamples {
  [key: string]: Sample[];
}

interface StoredSampleOutput {
  id?: string;
  date: string;
  buyerId: string;
  outputs: {
    [sampleId: string]: {
      CUT?: number;
      SEW?: number;
      FINISH?: number;
      inspected?: number;
      pass?: number;
      alter?: number;
      passAlter?: number;
      reject?: number;
      remark?: string;
      qcName?: string;
    };
  };
}

interface PendingSampleCount {
  FIT: number;
  PP: number;
  GPT: number;
  SMS: number;
  Other: number;
}

const defaultQCOutput: QCOutput = {
  inspected: 0,
  pass: 0,
  alter: 0,
  passAlter: 0,
  reject: 0,
  remark: '',
  qcName: '',
};

export default function DailyQCOutput() {
  const { userData } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedBuyer, setSelectedBuyer] = useState<string>('');
  const [fabricCategoryFilter, setFabricCategoryFilter] = useState<'All' | 'Knit' | 'Woven'>('All');
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [pendingSamples, setPendingSamples] = useState<PendingSampleCount>({
    FIT: 0,
    PP: 0,
    GPT: 0,
    SMS: 0,
    Other: 0,
  });
  const [loading, setLoading] = useState(true);
  const [groupedSamples, setGroupedSamples] = useState<GroupedSamples>({});
  const [sampleQCOutputs, setSampleQCOutputs] = useState<{ [key: string]: SampleQCOutput }>({});
  const [isSaving, setIsSaving] = useState<{ [key: string]: boolean }>({});
  const [finishedPieces, setFinishedPieces] = useState<{ [sampleId: string]: number }>({});
  const [alert, setAlert] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
  }>({
    show: false,
    message: '',
    type: 'success'
  });

  const canSave = userData && (userData.isAdmin || userData.team === 'Sampling');

  useEffect(() => {
    const fetchBuyers = async () => {
      const buyersData = await getDocuments('buyer') as Buyer[];
      setBuyers(buyersData);
      setLoading(false);
    };
    fetchBuyers();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedBuyer || !selectedDate) return;

      const samples = await getDocuments('samples') as Sample[];
      const grouped: GroupedSamples = {
        FIT: [],
        PP: [],
        GPT: [],
        SMS: [],
        Other: []
      };

      const pendingCounts: PendingSampleCount = {
        FIT: 0,
        PP: 0,
        GPT: 0,
        SMS: 0,
        Other: 0
      };

      // Get all outputs to calculate finished pieces and check for existing QC data
      const allOutputs = await getDocuments('dailySamplingOutputs') as StoredSampleOutput[];
      const finishedPiecesData: { [sampleId: string]: number } = {};
      
      // Calculate total finished pieces for each sample up to the selected date
      allOutputs.forEach(output => {
        if (output.buyerId === selectedBuyer && output.date <= selectedDate) {
          Object.entries(output.outputs).forEach(([sampleId, sampleOutput]) => {
            if (sampleOutput.FINISH) {
              finishedPiecesData[sampleId] = (finishedPiecesData[sampleId] || 0) + sampleOutput.FINISH;
            }
          });
        }
      });
      setFinishedPieces(finishedPiecesData);

      samples.forEach(sample => {
        if (
          sample.buyerId === selectedBuyer &&
          sample.fabricTrimsReceiptDate &&
          sample.fabricTrimsReceiptDate <= selectedDate &&
          ((sample.isArchived === undefined || sample.isArchived === false) || 
            (sample.changeTracking?.archived?.timestamp && 
             sample.changeTracking.archived.timestamp.split('T')[0] >= selectedDate)) &&
          (fabricCategoryFilter === 'All' || sample.fabricCategory === fabricCategoryFilter)
        ) {
          const sampleType = getSampleType(sample.typeOfSample);
          grouped[sampleType].push(sample);
          
          const finishedCount = finishedPiecesData[sample.sampleId] || 0;
          pendingCounts[sampleType] += finishedCount;
        }
      });

      // Load existing QC data
      const existingOutputs = await getDocuments('dailySamplingOutputs') as StoredSampleOutput[];
      const qcOutput = existingOutputs.find(
        output => output.date === selectedDate && output.buyerId === selectedBuyer
      );

      if (qcOutput) {
        const savedQCOutputs: { [key: string]: SampleQCOutput } = {};
        Object.values(grouped).flat().forEach(sample => {
          const existingData = qcOutput.outputs[sample.sampleId];
          savedQCOutputs[sample.sampleId] = {
            sampleId: sample.sampleId,
            inspected: existingData?.inspected || 0,
            pass: existingData?.pass || 0,
            alter: existingData?.alter || 0,
            passAlter: existingData?.passAlter || 0,
            reject: existingData?.reject || 0,
            remark: existingData?.remark || '',
            qcName: existingData?.qcName || '',
          };
        });
        setSampleQCOutputs(savedQCOutputs);
      } else {
        const newQCOutputs: { [key: string]: SampleQCOutput } = {};
        Object.values(grouped).flat().forEach(sample => {
          newQCOutputs[sample.sampleId] = {
            sampleId: sample.sampleId,
            ...defaultQCOutput
          };
        });
        setSampleQCOutputs(newQCOutputs);
      }

      setGroupedSamples(grouped);
      setPendingSamples(pendingCounts);
    };

    fetchData();
  }, [selectedBuyer, selectedDate, fabricCategoryFilter]);

  const getSampleType = (type: string): keyof PendingSampleCount => {
    if (type === 'FIT') return 'FIT';
    if (type === 'PP') return 'PP';
    if (type === 'GPT') return 'GPT';
    if (type === 'SMS/SRS/PA/COLOUR RUN') return 'SMS';
    return 'Other';
  };

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  const handleQCOutputChange = (
    sampleId: string,
    field: keyof QCOutput,
    value: string | number,
    finishedPiecesCount: number
  ) => {
    let processedValue = value;
    
    // For numeric fields, validate against finished pieces
    if (field !== 'remark' && field !== 'qcName') {
      const numValue = parseInt(value as string) || 0;
      // Prevent values that exceed the finished pieces count
      processedValue = Math.min(Math.max(0, numValue), finishedPiecesCount);
    }
    
    setSampleQCOutputs(prev => ({
      ...prev,
      [sampleId]: {
        ...prev[sampleId],
        sampleId,
        [field]: field === 'remark' || field === 'qcName' ? processedValue : processedValue
      }
    }));
  };

  const saveSampleTypeQCOutputs = async (sampleType: string) => {
    setIsSaving(prev => ({ ...prev, [sampleType]: true }));
    try {
      const samplesToSave = groupedSamples[sampleType];
      
      const existingOutputs = await getDocuments('dailySamplingOutputs') as StoredSampleOutput[];
      const existingOutput = existingOutputs.find(
        output => output.date === selectedDate && output.buyerId === selectedBuyer
      );

      const qcData: { [sampleId: string]: any } = {};
      samplesToSave.forEach(sample => {
        const qcOutput = sampleQCOutputs[sample.sampleId];
        if (qcOutput) {
          qcData[sample.sampleId] = {
            ...(existingOutput?.outputs[sample.sampleId] || {}),
            inspected: qcOutput.inspected,
            pass: qcOutput.pass,
            alter: qcOutput.alter,
            passAlter: qcOutput.passAlter,
            reject: qcOutput.reject,
            remark: qcOutput.remark,
            qcName: qcOutput.qcName,
          };
        }
      });

      if (existingOutput?.id) {
        await updateDocument('dailySamplingOutputs', existingOutput.id, {
          outputs: {
            ...existingOutput.outputs,
            ...qcData
          }
        });
      } else {
        await addDocument('dailySamplingOutputs', {
          date: selectedDate,
          buyerId: selectedBuyer,
          outputs: qcData
        });
      }

      setAlert({
        show: true,
        message: `Saved QC outputs for ${sampleType} samples`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error saving QC outputs:', error);
      setAlert({
        show: true,
        message: 'Error saving QC outputs',
        type: 'error'
      });
    } finally {
      setIsSaving(prev => ({ ...prev, [sampleType]: false }));
    }
  };

  const saveAllQCOutputs = async () => {
    setIsSaving(prev => ({ ...prev, all: true }));
    try {
      const existingOutputs = await getDocuments('dailySamplingOutputs') as StoredSampleOutput[];
      const existingOutput = existingOutputs.find(
        output => output.date === selectedDate && output.buyerId === selectedBuyer
      );

      const qcData: { [sampleId: string]: any } = {};
      Object.values(groupedSamples).flat().forEach(sample => {
        const qcOutput = sampleQCOutputs[sample.sampleId];
        if (qcOutput) {
          qcData[sample.sampleId] = {
            ...(existingOutput?.outputs[sample.sampleId] || {}),
            inspected: qcOutput.inspected,
            pass: qcOutput.pass,
            alter: qcOutput.alter,
            passAlter: qcOutput.passAlter,
            reject: qcOutput.reject,
            remark: qcOutput.remark,
            qcName: qcOutput.qcName,
          };
        }
      });

      if (existingOutput?.id) {
        await updateDocument('dailySamplingOutputs', existingOutput.id, {
          outputs: {
            ...existingOutput.outputs,
            ...qcData
          }
        });
      } else {
        await addDocument('dailySamplingOutputs', {
          date: selectedDate,
          buyerId: selectedBuyer,
          outputs: qcData
        });
      }

      setAlert({
        show: true,
        message: 'Saved all QC outputs successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error saving all QC outputs:', error);
      setAlert({
        show: true,
        message: 'Error saving all QC outputs',
        type: 'error'
      });
    } finally {
      setIsSaving(prev => ({ ...prev, all: false }));
    }
  };

  const getStatusBadge = (sample: Sample) => {
    // Check for no fabric received first
    if (Number(sample.totalFabricQtyRecieved) === 0 || !sample.totalFabricQtyRecieved) {
      return (
        <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full inline-block">
          No Fabric Received
        </div>
      );
    }
    
    if (sample.isArchived && sample.changeTracking?.archived?.timestamp) {
      const archiveDate = format(new Date(sample.changeTracking.archived.timestamp), 'dd/MM/yyyy');
      if (sample.changeTracking.archived.timestamp.split('T')[0] > selectedDate) {
        return (
          <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full inline-block">
            Archived on {archiveDate}
          </div>
        );
      }
    } else if (sample.status === 'Garment Ready' || sample.status === 'Dispatched') {
      return (
        <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full inline-block">
          {sample.status}
        </div>
      );
    }
    return null;
  };

  const canEnterQCData = (sampleId: string) => {
    return (finishedPieces[sampleId] || 0) > 0;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen p-6">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex items-center mb-4">
        <button onClick={() => setIsSidebarOpen(true)} className="mr-4">
          <Menu size={24} />
        </button>
        <h1 className="text-2xl font-bold">Daily QC Output</h1>
      </div>

      <div className="flex space-x-4 mb-6">
        <div className="w-64">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Buyer
          </label>
          <select
            value={selectedBuyer}
            onChange={(e) => setSelectedBuyer(e.target.value)}
            className="w-full border rounded-md p-2"
          >
            <option value="">Select a buyer</option>
            {buyers.map((buyer) => (
              <option key={buyer.buyerId} value={buyer.buyerId}>
                {buyer.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-64">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full border rounded-md p-2"
          />
        </div>

        {selectedBuyer && (
          <div className="w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fabric Category
            </label>
            <div className="flex space-x-1">
              {(['All', 'Knit', 'Woven'] as const).map((category) => (
                <button
                  key={category}
                  onClick={() => setFabricCategoryFilter(category)}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    fabricCategoryFilter === category
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedBuyer && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Finished Samples (Ready for QC)</h2>
          <div className="grid grid-cols-5 gap-4 mb-8">
            {Object.entries(pendingSamples).map(([type, count]) => (
              <div key={type} className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">{type}</div>
                <div className="text-2xl font-bold">{count}</div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            {Object.entries(groupedSamples).map(([sampleType, samples]) => (
              samples.length > 0 && (
                <div key={sampleType} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold">{sampleType}</h3>
                    {canSave && (
                      <Button
                        onClick={() => saveSampleTypeQCOutputs(sampleType)}
                        disabled={isSaving[sampleType]}
                      >
                        {isSaving[sampleType] ? 'Saving...' : 'Save'}
                      </Button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500">
                            Sample ID
                          </th>
                          <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 w-32">
                            Style
                          </th>
                          {sampleType === 'Other' && (
                            <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 w-32">
                              Sample Type
                            </th>
                          )}
                          <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500">
                            Finished Pieces
                          </th>
                          <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500">
                            Status
                          </th>
                          <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500">
                            Inspected
                          </th>
                          <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500">
                            Pass
                          </th>
                          <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500">
                            Alter
                          </th>
                          <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500">
                            Pass Alter
                          </th>
                          <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500">
                            Reject
                          </th>
                          <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 w-32">
                            Remark
                          </th>
                          <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 w-32">
                            QC Name
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {samples.map((sample) => {
                          const hasFinishedPieces = canEnterQCData(sample.sampleId);
                          return (
                            <tr key={sample.id} className={`hover:bg-gray-50 ${!hasFinishedPieces ? 'opacity-50' : ''}`}>
                              <td className="px-4 py-2 text-sm">{sample.sampleId}</td>
                              <td className="px-4 py-2 text-sm">
                                <div 
                                  className="truncate max-w-[120px]" 
                                  title={`${sample.style}${sample.color ? ` - ${sample.color}` : ''}`}
                                >
                                  {sample.style}
                                </div>
                              </td>
                              {sampleType === 'Other' && (
                                <td className="px-4 py-2 text-sm">
                                  <div className="truncate max-w-[120px]" title={sample.typeOfSample}>
                                    {sample.typeOfSample}
                                  </div>
                                </td>
                              )}
                              <td className="px-4 py-2 text-sm">
                                {finishedPieces[sample.sampleId] || 0}
                                {!hasFinishedPieces && (
                                  <div className="text-xs text-red-500 mt-1">No finished pieces</div>
                                )}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                {getStatusBadge(sample)}
                              </td>
                              {(['inspected', 'pass', 'alter', 'passAlter', 'reject'] as const).map((field) => {
                                const finishedPiecesCount = finishedPieces[sample.sampleId] || 0;
                                return (
                                  <td key={field} className="px-4 py-2">
                                    <input
                                      type="number"
                                      min="0"
                                      max={finishedPiecesCount}
                                      value={sampleQCOutputs[sample.sampleId]?.[field] || 0}
                                      onChange={(e) => handleQCOutputChange(
                                        sample.sampleId,
                                        field,
                                        e.target.value,
                                        finishedPiecesCount
                                      )}
                                      onWheel={handleWheel}
                                      className="w-16 border rounded-md p-1 text-sm"
                                      disabled={!canSave || !hasFinishedPieces}
                                    />
                                  </td>
                                );
                              })}
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  value={sampleQCOutputs[sample.sampleId]?.remark || ''}
                                  onChange={(e) => handleQCOutputChange(
                                    sample.sampleId,
                                    'remark',
                                    e.target.value,
                                    finishedPieces[sample.sampleId] || 0
                                  )}
                                  className="w-32 border rounded-md p-1 text-sm"
                                  disabled={!canSave || !hasFinishedPieces}
                                  placeholder="Enter remarks"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  value={sampleQCOutputs[sample.sampleId]?.qcName || ''}
                                  onChange={(e) => handleQCOutputChange(
                                    sample.sampleId,
                                    'qcName',
                                    e.target.value,
                                    finishedPieces[sample.sampleId] || 0
                                  )}
                                  className="w-32 border rounded-md p-1 text-sm"
                                  disabled={!canSave || !hasFinishedPieces}
                                  placeholder="QC Name"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ))}
            
            {Object.values(groupedSamples).some(samples => samples.length > 0) && canSave && (
              <div className="flex justify-end mt-6">
                <Button
                  onClick={saveAllQCOutputs}
                  disabled={isSaving.all}
                  className="bg-primary text-white"
                >
                  {isSaving.all ? 'Saving All...' : 'Save All QC Data'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {alert.show && (
        <Alert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(prev => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
} 