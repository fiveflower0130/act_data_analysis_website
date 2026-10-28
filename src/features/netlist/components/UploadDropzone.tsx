import { Upload, Typography } from 'antd';
import type { UploadProps } from 'antd';
import { FileJson, FileSpreadsheet, UploadCloud } from 'lucide-react';
import type { UploadTheme } from '../../../stores/uploadStore';
import { useResponsiveTokens } from '../../../hooks/useResponsiveTokens';
import { useThemeColors } from '../../../hooks/useThemeColors';

const { Dragger } = Upload;
const { Text } = Typography;

interface UploadDropzoneProps {
  theme: UploadTheme;
  onFilesSelected: (files: File[]) => void;
  onInvalidFiles?: (fileNames: string[]) => void;
  disabled?: boolean;
}

const UploadDropzone = ({
  theme,
  onFilesSelected,
  onInvalidFiles,
  disabled = false,
}: UploadDropzoneProps) => {
  const colorMode = useThemeColors();
  const responsive = useResponsiveTokens();
  const isNetlist = theme === 'netlist';
  const acceptedExtension = isNetlist ? '.xlsx' : '.json';

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (!file.name.toLowerCase().endsWith(acceptedExtension)) {
      onInvalidFiles?.([file.name]);
      return Upload.LIST_IGNORE;
    }
    onFilesSelected([file]);
    return Upload.LIST_IGNORE;
  };

  return (
    <Dragger
      multiple
      accept={{ format: acceptedExtension, filter: 'native' }}
      showUploadList={false}
      beforeUpload={beforeUpload}
      disabled={disabled}
      style={{
        minHeight: responsive.isMobile ? 150 : 200,
        borderColor: colorMode.primaryMuted,
        background: colorMode.surface,
        borderRadius: responsive.spacing.uploadZoneRadius,
      }}
    >
      {isNetlist ? (
        <FileSpreadsheet size={28} color={colorMode.primary} strokeWidth={1.5} />
      ) : (
        <FileJson size={28} color={colorMode.primary} strokeWidth={1.5} />
      )}
      <p style={{ color: colorMode.textPrimary, fontSize: responsive.typography.contentTitle, margin: '10px 0 4px' }}>
        <UploadCloud size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
        拖曳檔案到此處，或點擊選擇（可複選）
      </p>
      <Text style={{ color: colorMode.textMuted, fontSize: responsive.typography.caption }}>
        {isNetlist
          ? 'NL-{Test_Program}_({Security}).xlsx（單檔上限 2MB）'
          : '{Test_Program}_{Lot_ID}__{AT|RT}_{時間}.json（單檔上限 2MB）'}
      </Text>
    </Dragger>
  );
};

export default UploadDropzone;
