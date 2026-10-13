import { useState } from 'react';
import { Download, ExternalLink, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/axios.js';
import { useTranslation } from '../lib/i18n.js';

export default function DocumentLink({ messageId, documentName = 'attachment', className = '' }) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const isPdf = documentName.toLowerCase().endsWith('.pdf');

  const getDocument = async () => {
    const response = await api.get(`/messages/${messageId}/document`, {
      responseType: 'blob',
      timeout: 120000,
    });
    return URL.createObjectURL(response.data);
  };

  const downloadDocument = async (event) => {
    event.stopPropagation();
    setIsLoading(true);
    try {
      const url = await getDocument();
      const link = document.createElement('a');
      link.href = url;
      link.download = documentName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toast.error(t(error.response?.data?.message || 'Unable to download this document.'));
    } finally {
      setIsLoading(false);
    }
  };

  const openDocument = async (event) => {
    event.stopPropagation();
    const previewWindow = window.open('about:blank', '_blank');
    if (!previewWindow) {
      toast.error(t('Allow pop-ups to preview this document.'));
      return;
    }
    setIsLoading(true);
    try {
      const url = await getDocument();
      previewWindow.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      previewWindow.close();
      toast.error(t(error.response?.data?.message || 'Unable to open this document.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <FileText size={20} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate text-sm">{documentName}</span>
      {isLoading ? (
        <span className="loading loading-spinner loading-xs shrink-0" />
      ) : (
        <>
          {isPdf && (
            <button
              type="button"
              onClick={openDocument}
              className="btn btn-ghost btn-xs shrink-0"
              aria-label={t('Open document')}
              title={t('Open document')}
            >
              <ExternalLink size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={downloadDocument}
            className="btn btn-ghost btn-xs shrink-0"
            aria-label={t('Download document')}
            title={t('Download document')}
          >
            <Download size={15} />
          </button>
        </>
      )}
    </div>
  );
}
