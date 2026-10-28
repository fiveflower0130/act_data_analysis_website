import { Empty, Typography } from 'antd';
import { FileSearch } from 'lucide-react';
import type { SelectedUpload } from './UploadedReferenceList';
import NetlistPreview from './NetlistPreview';
import FailSamplePreview from './FailSamplePreview';
import { useThemeColors } from '../../../hooks/useThemeColors';

const { Text } = Typography;

interface UploadPreviewPanelProps {
  selection: SelectedUpload | null;
}

const UploadPreviewPanel = ({ selection }: UploadPreviewPanelProps) => {
  const colorMode = useThemeColors();

  if (!selection) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          minHeight: 300,
          border: `1px dashed ${colorMode.border}`,
          borderRadius: 12,
          background: colorMode.card,
        }}
      >
        <Empty
          image={<FileSearch size={40} color={colorMode.primaryMuted} />}
          description={<Text style={{ color: colorMode.textMuted }}>請從左側選擇已上傳批次以查看預覽</Text>}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        padding: 16,
        border: `1px solid ${colorMode.border}`,
        borderRadius: 12,
        background: colorMode.surface,
        boxSizing: 'border-box',
      }}
    >
      {selection.theme === 'netlist' ? (
        <NetlistPreview key={selection.item.id} program={selection.item} />
      ) : (
        <FailSamplePreview key={selection.item.batch_id} batch={selection.item} />
      )}
    </div>
  );
};

export default UploadPreviewPanel;
