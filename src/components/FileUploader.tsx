type FileUploaderProps = {
  accept?: string;
  onFileSelect: (file: File) => void;
  label?: string;
  hint?: string;
};

export function FileUploader({
  accept = ".csv,.xlsx,.xls,.pdf",
  onFileSelect,
  label = "Choose a file",
  hint = "CSV, XLSX, or PDF bank statements",
}: FileUploaderProps) {
  return (
    <label className="file-uploader">
      <input
        type="file"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
          e.target.value = "";
        }}
        className="file-uploader-input"
      />
      <span className="file-uploader-icon" aria-hidden="true">
        📄
      </span>
      <span className="file-uploader-label">{label}</span>
      <span className="file-uploader-hint">{hint}</span>
    </label>
  );
}
