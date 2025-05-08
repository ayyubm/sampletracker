import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';

// Define the styles for our design sheet
const styles = StyleSheet.create({
  page: {
    padding: 10,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  box: {
    width: '49%',
    height: 380,
    border: '1pt solid #000000',
    marginBottom: 10,
    padding: 5,
    position: 'relative',
  },
  imageContainer: {
    width: '45%',
    height: 200,
    marginBottom: 10,
  },
  sampleImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  noImage: {
    color: '#999999',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 50,
  },
  detailsContainer: {
    marginTop: 5,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    width: 65,
  },
  detailValue: {
    fontSize: 10,
    flex: 1,
  },
  infoBlock: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: '50%',
  },
  styleRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  styleLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    width: 55,
  },
  styleValue: {
    fontSize: 8,
    flex: 1,
  },
  sampleStatus: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
  },
  sampleStatusLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    marginRight: 5,
  },
  sampleStatusValue: {
    fontSize: 8,
  },
  sampleETD: {
    position: 'absolute',
    bottom: 25,
    left: 10,
    flexDirection: 'row',
  },
  sampleETDLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    marginRight: 5,
  },
  sampleETDValue: {
    fontSize: 8,
  },
});

// Sample interface 
interface Sample {
  sampleId: string;
  style: string;
  buyer: string;
  color: string;
  patternNo?: string;
  typeOfFabric?: string;
  typeOfSample: string;
  status: string;
  noOfPieces: number;
  requiredCompletionDate: string;
  imageDataURI?: string;
}

interface DesignSheetPDFProps {
  samples: Sample[];
  title: string;
}

const SampleBox = ({ sample }: { sample: Sample }) => (
  <View style={styles.box}>
    <View style={styles.imageContainer}>
      {sample.imageDataURI ? (
        <Image src={sample.imageDataURI} style={styles.sampleImage} />
      ) : (
        <Text style={styles.noImage}>No image</Text>
      )}
    </View>
    
    <View style={styles.infoBlock}>
      <View style={styles.styleRow}>
        <Text style={styles.styleLabel}>STYLE:</Text>
        <Text style={styles.styleValue}>{sample.style}</Text>
      </View>
      <View style={styles.styleRow}>
        <Text style={styles.styleLabel}>PATTERN:</Text>
        <Text style={styles.styleValue}>{sample.patternNo || ''}</Text>
      </View>
      <View style={styles.styleRow}>
        <Text style={styles.styleLabel}>FABRIC:</Text>
        <Text style={styles.styleValue}>{sample.typeOfFabric || ''}</Text>
      </View>
    </View>
    
    <View style={styles.sampleETD}>
      <Text style={styles.sampleETDLabel}>SAMPLE ETD:</Text>
      <Text style={styles.sampleETDValue}>
        {sample.requiredCompletionDate ? format(new Date(sample.requiredCompletionDate), 'dd/MM/yy') : ''}
      </Text>
    </View>
    
    <View style={styles.sampleStatus}>
      <Text style={styles.sampleStatusLabel}>SAMPLE STATUS:</Text>
      <Text style={styles.sampleStatusValue}>{sample.status}</Text>
    </View>
  </View>
);

const DesignSheetPDF = ({ samples, title }: DesignSheetPDFProps) => {
  // Calculate how many samples per page (4 per page)
  const SAMPLES_PER_PAGE = 4;
  
  // Calculate how many pages we need
  const pageCount = Math.ceil(samples.length / SAMPLES_PER_PAGE);
  
  // Split samples into pages
  const pages = Array.from({ length: pageCount }, (_, i) => {
    const start = i * SAMPLES_PER_PAGE;
    return samples.slice(start, start + SAMPLES_PER_PAGE);
  });

  return (
    <Document>
      {pages.map((pageSamples, pageIndex) => (
        <Page key={`page_${pageIndex}`} size="A4" style={styles.page}>
          <Text style={styles.title}>{title} (Page {pageIndex + 1} of {pageCount})</Text>
          
          <View style={styles.gridContainer}>
            {pageSamples.map((sample) => (
              <SampleBox key={sample.sampleId} sample={sample} />
            ))}
            
            {/* Add empty boxes if we don't have 4 samples to fill the page */}
            {Array.from({ length: SAMPLES_PER_PAGE - pageSamples.length }).map((_, i) => (
              <View key={`empty_${i}`} style={styles.box} />
            ))}
          </View>
        </Page>
      ))}
    </Document>
  );
};

export default DesignSheetPDF; 