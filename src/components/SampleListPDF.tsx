import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 8,
  },
  title: {
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    minHeight: 20,
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 'bold',
    padding: 4,
    paddingVertical: 6,
    borderRightWidth: 1,
    borderRightColor: '#000',
  },
  tableCell: {
    fontSize: 7,
    padding: 4,
    paddingVertical: 5,
    borderRightWidth: 1,
    borderRightColor: '#000',
  },
  id: { width: '14%' },
  style: { width: '18%' },
  buyer: { width: '18%' },
  patternNo: { width: '14%' },
  type: { width: '16%' },
  pieces: { width: '8%' },
  date: { width: '12%' },
});

interface Sample {
  sampleId: string;
  style: string;
  buyer: string;
  patternNo: string;
  typeOfSample: string;
  noOfPieces: number;
  requiredCompletionDate: string;
}

interface SampleListPDFProps {
  samples: Sample[];
  status: string;
}

const SampleListPDF = ({ samples, status }: SampleListPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Sample List - {status}</Text>
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={[styles.tableHeaderCell, styles.id]}>Sample ID</Text>
          <Text style={[styles.tableHeaderCell, styles.style]}>Style</Text>
          <Text style={[styles.tableHeaderCell, styles.buyer]}>Buyer</Text>
          <Text style={[styles.tableHeaderCell, styles.patternNo]}>Pattern No</Text>
          <Text style={[styles.tableHeaderCell, styles.type]}>Type</Text>
          <Text style={[styles.tableHeaderCell, styles.pieces]}>Pieces</Text>
          <Text style={[styles.tableHeaderCell, styles.date]}>Required Date</Text>
        </View>
        {samples.map((sample) => (
          <View key={sample.sampleId} style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.id]}>{sample.sampleId}</Text>
            <Text style={[styles.tableCell, styles.style]}>{sample.style}</Text>
            <Text style={[styles.tableCell, styles.buyer]}>{sample.buyer}</Text>
            <Text style={[styles.tableCell, styles.patternNo]}>{sample.patternNo}</Text>
            <Text style={[styles.tableCell, styles.type]}>{sample.typeOfSample}</Text>
            <Text style={[styles.tableCell, styles.pieces]}>{sample.noOfPieces}</Text>
            <Text style={[styles.tableCell, styles.date]}>
              {sample.requiredCompletionDate ? format(new Date(sample.requiredCompletionDate), 'dd/MM/yy') : ''}
            </Text>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);

export default SampleListPDF; 