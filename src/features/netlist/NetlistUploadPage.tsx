import { Alert, Button } from 'antd';
import { UploadCloud } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import useUploadStore, { type UploadTheme } from '../../stores/uploadStore';
import { useResponsiveTokens } from '../../hooks/useResponsiveTokens';
import { useThemeColors } from '../../hooks/useThemeColors';
import UploadThemeSelector from './components/UploadThemeSelector';
import UploadedReferenceList, {
  type SelectedUpload,
} from './components/UploadedReferenceList';
import UploadDrawer from './components/UploadDrawer';
import UploadPreviewPanel from './components/UploadPreviewPanel';

const PAGE_SIZE = 10;

const formatDateValue = (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
};

const NetlistUploadPage = () => {
  const {
    activeTheme,
    queues,
    netlistPrograms,
    failSampleImports,
    failSampleTotal,
    isLoading,
    uploadingByTopic,
    error,
    setActiveTheme,
    addFiles,
    removeQueueItem,
    clearQueue,
    uploadAll,
    fetchNetlistPrograms,
    fetchFailSampleImports,
    clearError,
  } = useUploadStore();
  const responsive = useResponsiveTokens();
  const colorMode = useThemeColors();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selection, setSelection] = useState<SelectedUpload | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [listPage, setListPage] = useState(1);

  useEffect(() => {
    void fetchNetlistPrograms();
  }, [fetchNetlistPrograms]);

  useEffect(() => {
    if (activeTheme !== 'fail-sample') return undefined;

    const timer = window.setTimeout(() => {
      void fetchFailSampleImports({
        q: searchTerm.trim() || undefined,
        limit: PAGE_SIZE,
        offset: (listPage - 1) * PAGE_SIZE,
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [activeTheme, fetchFailSampleImports, listPage, searchTerm]);

  const visibleNetlistPrograms = useMemo(() => {
    const keyword = searchTerm.trim().toLocaleLowerCase();
    const filtered = netlistPrograms.filter((program) => {
      if (!keyword) return true;
      return [
        program.test_program,
        program.filename,
        program.security_level,
        program.uploaded_by,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase().includes(keyword));
    });

    return [...filtered]
      .sort((left, right) => {
        const leftDate = new Date(formatDateValue(left.uploaded_at)).getTime();
        const rightDate = new Date(formatDateValue(right.uploaded_at)).getTime();
        return rightDate - leftDate;
      })
      .slice((listPage - 1) * PAGE_SIZE, listPage * PAGE_SIZE);
  }, [listPage, netlistPrograms, searchTerm]);

  const currentQueue = queues[activeTheme];
  const currentUploading = uploadingByTopic[activeTheme];
  const listTotal = activeTheme === 'netlist' ? netlistPrograms.filter((program) => {
    const keyword = searchTerm.trim().toLocaleLowerCase();
    if (!keyword) return true;
    return [
      program.test_program,
      program.filename,
      program.security_level,
      program.uploaded_by,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase().includes(keyword));
  }).length : failSampleTotal;

  const selectedId =
    selection?.theme === activeTheme
      ? selection.theme === 'netlist'
        ? selection.item.id
        : selection.item.batch_id
      : null;

  const handleThemeChange = (theme: UploadTheme) => {
    setActiveTheme(theme);
    setSelection(null);
    setSearchTerm('');
    setListPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setListPage(1);
  };

  const handlePageChange = (page: number) => {
    setListPage(page);
  };

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        background: colorMode.base,
      }}
    >
      <aside
        style={{
          flex: responsive.isMobile ? '0 0 280px' : '0 0 400px',
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: responsive.isMobile ? 12 : 16,
          boxSizing: 'border-box',
          overflow: 'hidden',
          background: colorMode.surface,
          borderRight: `1px solid ${colorMode.border}`,
        }}
      >

        <UploadThemeSelector
          value={activeTheme}
          onChange={handleThemeChange}
        />

        <Button
          type="primary"
          icon={<UploadCloud size={16} />}
          onClick={() => setDrawerOpen(true)}
          style={{ flexShrink: 0 }}
        >
          上傳檔案（{currentQueue.length}）
        </Button>

        <UploadedReferenceList
          theme={activeTheme}
          netlistPrograms={activeTheme === 'netlist' ? visibleNetlistPrograms : []}
          failSampleImports={activeTheme === 'fail-sample' ? failSampleImports : []}
          total={listTotal}
          page={listPage}
          searchTerm={searchTerm}
          selectedId={selectedId}
          loading={isLoading && !currentUploading}
          onSearchChange={handleSearchChange}
          onPageChange={handlePageChange}
          onSelect={setSelection}
        />

      </aside>

      <main
        style={{
          flex: 1,
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: responsive.isMobile ? 12 : 16,
          overflow: 'hidden',
          background: colorMode.base,
        }}
      >
        {error && !drawerOpen && (
          <Alert
            type="error"
            showIcon
            title={error}
            closable
            onClose={clearError}
            style={{ flexShrink: 0 }}
          />
        )}

        <div style={{ flex: 1, minHeight: 0 }}>
          <UploadPreviewPanel selection={selection} />
        </div>
      </main>

      <UploadDrawer
        open={drawerOpen}
        theme={activeTheme}
        queue={currentQueue}
        isUploading={currentUploading}
        error={drawerOpen ? error : null}
        onClose={() => setDrawerOpen(false)}
        onFilesSelected={addFiles}
        onInvalidFiles={() => undefined}
        onRemove={removeQueueItem}
        onClear={clearQueue}
        onUploadAll={() => void uploadAll()}
        onClearError={clearError}
      />
    </div>
  );
};

export default NetlistUploadPage;
