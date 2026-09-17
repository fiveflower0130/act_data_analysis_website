import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UploadDropzone from '../../src/features/netlist/components/UploadDropzone';

const dispatchDrop = (dropzone: HTMLElement, files: File[]) => {
  const dataTransfer = {
    files,
    items: files.map((file) => ({
      kind: 'file',
      type: file.type,
      getAsFile: () => file,
    })),
    types: ['Files'],
  };
  const dropEvent = new Event('drop', { bubbles: true, cancelable: true }) as unknown as DragEvent;
  Object.defineProperty(dropEvent, 'dataTransfer', { value: dataTransfer });
  dropzone.dispatchEvent(dropEvent);
};

describe('UploadDropzone 拖曳上傳', () => {
  it('拖曳三個副檔名正確的 Netlist 檔案後逐一加入佇列', async () => {
    const onFilesSelected = vi.fn<(files: File[]) => void>();
    const { container } = render(<UploadDropzone theme="netlist" onFilesSelected={onFilesSelected} />);
    const dropzone = container.querySelector('.ant-upload-btn');
    expect(dropzone).not.toBeNull();

    const files = [
      new File(['a'], 'a.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      new File(['b'], 'b.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      new File(['c'], 'c.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    ];

    dispatchDrop(dropzone as HTMLElement, files);

    await waitFor(() => expect(onFilesSelected).toHaveBeenCalledTimes(3));
    files.forEach((file, index) => {
      expect(onFilesSelected).toHaveBeenNthCalledWith(index + 1, [file]);
    });
  });

  it('拖曳含有錯誤副檔名的檔案時忽略該檔案', async () => {
    const onFilesSelected = vi.fn<(files: File[]) => void>();
    const { container } = render(<UploadDropzone theme="netlist" onFilesSelected={onFilesSelected} />);
    const dropzone = container.querySelector('.ant-upload-btn');
    expect(dropzone).not.toBeNull();

    const files = [
      new File(['valid-a'], 'valid-a.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      new File(['invalid'], 'invalid.json', { type: 'application/json' }),
      new File(['valid-b'], 'valid-b.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    ];

    dispatchDrop(dropzone as HTMLElement, files);

    await waitFor(() => expect(onFilesSelected).toHaveBeenCalledTimes(2));
    expect(onFilesSelected).toHaveBeenNthCalledWith(1, [files[0]]);
    expect(onFilesSelected).toHaveBeenNthCalledWith(2, [files[2]]);
  });
});
