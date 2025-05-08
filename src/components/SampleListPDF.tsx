import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';

// Helper function to check if URL appears valid (not strictly needed if using data URIs primarily)
// const isValidImageUrl = (url: string | undefined): boolean => {
//   if (!url) return false;
//   return url.startsWith('http') || url.startsWith('https');
// };

const styles = StyleSheet.create({
  page: {
    padding: 15,
    fontSize: 8,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    marginTop: 5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    minHeight: 70,
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
    alignItems: 'center', // Center content vertically in cell
    justifyContent: 'center', // Center content horizontally in cell
  },
  textCell: { // Specific style for text to allow normal alignment
    alignItems: 'center', // Change from flex-start to center
    justifyContent: 'center', // Change from flex-start to center
    textAlign: 'center', // Add text alignment
    padding: 4, // Re-apply padding if overridden by tableCell
  },
  id: { width: '12%' },
  image: { width: '10%' }, // Style for the View containing the image/text
  style: { width: '16%' },
  buyer: { width: '16%' },
  color: { width: '12%' }, // Rename from patternNo to color
  type: { width: '14%' },
  pieces: { width: '8%' },
  date: { width: '12%' },
  sampleImage: {
    width: 80,
    height: 80,
    objectFit: 'contain',
  },
  imageCell: { // This View wraps the Image or Text for no image
    // Inherits alignItems, justifyContent from tableCell for centering image/text
    // No specific width/height, let content dictate if needed, or fixed by parent 'image' style
  },
  noImage: {
    color: '#999',
    fontSize: 6,
    textAlign: 'center',
  }
});

// This interface should match the structure of objects in `processedSamples`
interface Sample {
  sampleId: string;
  style: string;
  buyer: string;
  color: string;
  typeOfSample: string;
  noOfPieces: number;
  requiredCompletionDate: string;
  imageUrl?: string;      // Original URL, might be useful for debugging, but not directly rendered
  imageDataURI?: string;  // The base64 data URI for the image
}

interface SampleListPDFProps {
  samples: Sample[];
  status: string;
}

const ImageOrFallback = ({ dataURI }: { dataURI?: string }) => {
  if (dataURI) {
    return (
      <Image 
        src={dataURI} 
        style={styles.sampleImage}
      />
    );
  }
  return <Text style={styles.noImage}>No image</Text>;
};

const SampleListPDF = ({ samples, status }: SampleListPDFProps) => {
  // Calculate how many samples per page (adjust based on your needs)
  const SAMPLES_PER_PAGE = 8; // This should fit nicely on an A4 page with our row heights
  
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
          <Text style={styles.title}>Sample List - {status} (Page {pageIndex + 1} of {pageCount})</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableHeaderCell, styles.id, styles.textCell]}>Sample ID</Text>
              <Text style={[styles.tableHeaderCell, styles.image]}>Style Image</Text>
              <Text style={[styles.tableHeaderCell, styles.style, styles.textCell]}>Style</Text>
              <Text style={[styles.tableHeaderCell, styles.buyer, styles.textCell]}>Buyer</Text>
              <Text style={[styles.tableHeaderCell, styles.color, styles.textCell]}>Color</Text>
              <Text style={[styles.tableHeaderCell, styles.type, styles.textCell]}>Type</Text>
              <Text style={[styles.tableHeaderCell, styles.pieces, styles.textCell]}>Pieces</Text>
              <Text style={[styles.tableHeaderCell, styles.date, styles.textCell]}>Required Date</Text>
            </View>
            
            {/* Table Rows for this page */}
            {pageSamples.map((sample) => (
              <View key={sample.sampleId} style={styles.tableRow}>
                <View style={[styles.tableCell, styles.id, styles.textCell]}><Text>{sample.sampleId}</Text></View>
                <View style={[styles.tableCell, styles.image]}><ImageOrFallback dataURI={sample.imageDataURI} /></View>
                <View style={[styles.tableCell, styles.style, styles.textCell]}><Text>{sample.style}</Text></View>
                <View style={[styles.tableCell, styles.buyer, styles.textCell]}><Text>{sample.buyer}</Text></View>
                <View style={[styles.tableCell, styles.color, styles.textCell]}><Text>{sample.color}</Text></View>
                <View style={[styles.tableCell, styles.type, styles.textCell]}><Text>{sample.typeOfSample}</Text></View>
                <View style={[styles.tableCell, styles.pieces, styles.textCell]}><Text>{sample.noOfPieces}</Text></View>
                <View style={[styles.tableCell, styles.date, styles.textCell]}>
                  <Text>{sample.requiredCompletionDate ? format(new Date(sample.requiredCompletionDate), 'dd/MM/yy') : ''}</Text>
                </View>
              </View>
            ))}
          </View>
        </Page>
      ))}
    </Document>
  );
};

export default SampleListPDF; 