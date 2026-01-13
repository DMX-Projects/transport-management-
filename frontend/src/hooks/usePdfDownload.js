import { useEffect, useState } from 'react';
import { useRequestBillPdfMutation, useRequestLrPdfMutation, useRequestHpaPdfMutation } from '../reports/reportsApi';
import { useCheckTaskStatusQuery } from '../reports/reportsApi';

/**
 * Custom hook for async PDF generation and download
 * Handles the complete workflow: request -> poll status -> download
 */
export function usePdfDownload() {
    const [taskId, setTaskId] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState(null);
    
    const [requestBillPdf] = useRequestBillPdfMutation();
    const [requestLrPdf] = useRequestLrPdfMutation();
    const [requestHpaPdf] = useRequestHpaPdfMutation();
    
    // Poll task status while processing
    const { data: taskStatus, isLoading: isChecking } = useCheckTaskStatusQuery(
        taskId,
        { skip: !taskId, pollingInterval: 2000 }
    );
    
    // Auto-download when PDF is ready
    useEffect(() => {
        if (taskStatus?.status === 'success' && taskStatus?.download_url) {
            downloadPdf(taskStatus.download_url, taskStatus.file_name);
            setTaskId(null);
        }
    }, [taskStatus]);
    
    const downloadPdf = (url, filename) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'download.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const requestBillDownload = async (billId) => {
        try {
            setDownloading(true);
            setError(null);
            const result = await requestBillPdf(billId).unwrap();
            setTaskId(result.task_id);
        } catch (err) {
            setError(err.data?.error || 'Failed to request PDF generation');
            setDownloading(false);
        }
    };
    
    const requestLrDownload = async (lrId) => {
        try {
            setDownloading(true);
            setError(null);
            const result = await requestLrPdf(lrId).unwrap();
            setTaskId(result.task_id);
        } catch (err) {
            setError(err.data?.error || 'Failed to request PDF generation');
            setDownloading(false);
        }
    };
    
    const requestHpaDownload = async (hpaId) => {
        try {
            setDownloading(true);
            setError(null);
            const result = await requestHpaPdf(hpaId).unwrap();
            setTaskId(result.task_id);
        } catch (err) {
            setError(err.data?.error || 'Failed to request PDF generation');
            setDownloading(false);
        }
    };
    
    const getProgress = () => {
        if (!taskStatus) return 0;
        return taskStatus.progress || 0;
    };
    
    const getStatus = () => {
        if (!taskStatus) return 'idle';
        return taskStatus.status || 'idle';
    };
    
    return {
        requestBillDownload,
        requestLrDownload,
        requestHpaDownload,
        downloading: downloading || isChecking,
        error,
        progress: getProgress(),
        status: getStatus(),
        taskId,
    };
}

/**
 * Helper function to trigger direct PDF download
 * Use when PDF is already generated (cached)
 */
export function downloadPdfDirect(url, filename = 'document.pdf') {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Handle CORS and authentication
    fetch(url, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.blob())
    .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    })
    .catch(error => console.error('Download failed:', error));
}

/**
 * Alternative hook for polling-based status checking
 */
export function usePdfDownloadPolling(taskId, onSuccess, onError) {
    const [isPolling, setIsPolling] = useState(!!taskId);
    
    useEffect(() => {
        if (!taskId) {
            setIsPolling(false);
            return;
        }
        
        const interval = setInterval(async () => {
            try {
                const response = await fetch(
                    `/api/v1/reports/task-status/?task_id=${taskId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    }
                );
                
                const data = await response.json();
                
                if (data.status === 'success') {
                    setIsPolling(false);
                    onSuccess?.(data);
                    clearInterval(interval);
                } else if (data.status === 'failed') {
                    setIsPolling(false);
                    onError?.(data.error);
                    clearInterval(interval);
                }
            } catch (error) {
                onError?.(error.message);
                clearInterval(interval);
            }
        }, 2000);
        
        return () => clearInterval(interval);
    }, [taskId, onSuccess, onError]);
    
    return isPolling;
}
