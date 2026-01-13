"""
Celery tasks for async PDF generation and reporting
"""
from celery import shared_task
from django.core.cache import cache
from django.conf import settings
from apps.billing.models import Bill
from apps.lr.models import LorryReceipt
from apps.hpa.models import HirePaymentAdvice
from apps.billing.pdf_generator import generate_bill_pdf
from apps.lr.pdf_generator import generate_lr_pdf
from apps.hpa.pdf_generator import generate_hpa_pdf
from .pdf_utils import PDFCacheManager, cleanup_old_pdfs as cleanup_pdfs
import logging

logger = logging.getLogger(__name__)

# Task names for frontend tracking
TASK_PENDING = 'pending'
TASK_PROCESSING = 'processing'
TASK_SUCCESS = 'success'
TASK_FAILED = 'failed'


@shared_task(bind=True, max_retries=3)
def generate_bill_pdf_async(self, bill_id):
    """
    Async task to generate Bill PDF
    Returns: task status with download URL
    """
    task_id = self.request.id
    cache_key = f"task_status_{task_id}"
    
    try:
        # Update status
        cache.set(cache_key, {'status': TASK_PROCESSING, 'progress': 10}, 3600)
        
        # Fetch bill
        bill = Bill.objects.select_related(
            'consignor', 'branch'
        ).get(pk=bill_id)
        
        cache.set(cache_key, {'status': TASK_PROCESSING, 'progress': 30}, 3600)
        
        # Generate PDF
        pdf_buffer = generate_bill_pdf(bill)
        
        cache.set(cache_key, {'status': TASK_PROCESSING, 'progress': 70}, 3600)
        
        # Cache the PDF
        cache_mgr = PDFCacheManager()
        pdf_cache_key = cache_mgr.get_pdf_cache_key('Bill', bill_id)
        cache_mgr.cache_pdf(pdf_cache_key, pdf_buffer)
        
        # Save to disk
        file_path = cache_mgr.get_pdf_file_path('Bill', bill_id, f'bill_{bill.bill_number}.pdf')
        cache_mgr.save_pdf_to_disk(pdf_buffer, file_path)
        
        # Update final status
        result = {
            'status': TASK_SUCCESS,
            'progress': 100,
            'file_name': f'bill_{bill.bill_number}.pdf',
            'download_url': f'/api/v1/reports/download-bill/{bill_id}/',
            'cache_key': pdf_cache_key,
        }
        
        cache.set(cache_key, result, 3600)
        logger.info(f"Successfully generated PDF for Bill {bill_id}")
        
        return result
        
    except Bill.DoesNotExist:
        logger.error(f"Bill {bill_id} not found")
        cache.set(cache_key, {'status': TASK_FAILED, 'error': 'Bill not found'}, 3600)
        return {'status': TASK_FAILED, 'error': 'Bill not found'}
    except Exception as exc:
        logger.error(f"Error generating Bill PDF: {str(exc)}")
        
        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=2 ** self.request.retries)
        
        cache.set(cache_key, {
            'status': TASK_FAILED,
            'error': f'Failed after {self.max_retries} retries: {str(exc)}'
        }, 3600)
        
        return {
            'status': TASK_FAILED,
            'error': str(exc)
        }


@shared_task(bind=True, max_retries=3)
def generate_lr_pdf_async(self, lr_id):
    """Async task to generate LR PDF"""
    task_id = self.request.id
    cache_key = f"task_status_{task_id}"
    
    try:
        cache.set(cache_key, {'status': TASK_PROCESSING, 'progress': 10}, 3600)
        
        lr = LorryReceipt.objects.select_related(
            'branch', 'truck', 'consignor'
        ).get(pk=lr_id)
        
        cache.set(cache_key, {'status': TASK_PROCESSING, 'progress': 30}, 3600)
        
        pdf_buffer = generate_lr_pdf(lr)
        
        cache.set(cache_key, {'status': TASK_PROCESSING, 'progress': 70}, 3600)
        
        cache_mgr = PDFCacheManager()
        pdf_cache_key = cache_mgr.get_pdf_cache_key('LorryReceipt', lr_id)
        cache_mgr.cache_pdf(pdf_cache_key, pdf_buffer)
        
        file_path = cache_mgr.get_pdf_file_path('LorryReceipt', lr_id, f'lr_{lr.lr_number}.pdf')
        cache_mgr.save_pdf_to_disk(pdf_buffer, file_path)
        
        result = {
            'status': TASK_SUCCESS,
            'progress': 100,
            'file_name': f'lr_{lr.lr_number}.pdf',
            'download_url': f'/api/v1/reports/download-lr/{lr_id}/',
            'cache_key': pdf_cache_key,
        }
        
        cache.set(cache_key, result, 3600)
        logger.info(f"Successfully generated PDF for LR {lr_id}")
        
        return result
        
    except LorryReceipt.DoesNotExist:
        logger.error(f"LR {lr_id} not found")
        cache.set(cache_key, {'status': TASK_FAILED, 'error': 'LR not found'}, 3600)
        return {'status': TASK_FAILED, 'error': 'LR not found'}
    except Exception as exc:
        logger.error(f"Error generating LR PDF: {str(exc)}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=2 ** self.request.retries)
        
        cache.set(cache_key, {
            'status': TASK_FAILED,
            'error': f'Failed after {self.max_retries} retries: {str(exc)}'
        }, 3600)
        
        return {'status': TASK_FAILED, 'error': str(exc)}


@shared_task(bind=True, max_retries=3)
def generate_hpa_pdf_async(self, hpa_id):
    """Async task to generate HPA PDF"""
    task_id = self.request.id
    cache_key = f"task_status_{task_id}"
    
    try:
        cache.set(cache_key, {'status': TASK_PROCESSING, 'progress': 10}, 3600)
        
        hpa = HirePaymentAdvice.objects.select_related(
            'lr', 'truck', 'branch'
        ).get(pk=hpa_id)
        
        cache.set(cache_key, {'status': TASK_PROCESSING, 'progress': 30}, 3600)
        
        pdf_buffer = generate_hpa_pdf(hpa)
        
        cache.set(cache_key, {'status': TASK_PROCESSING, 'progress': 70}, 3600)
        
        cache_mgr = PDFCacheManager()
        pdf_cache_key = cache_mgr.get_pdf_cache_key('HirePaymentAdvice', hpa_id)
        cache_mgr.cache_pdf(pdf_cache_key, pdf_buffer)
        
        file_path = cache_mgr.get_pdf_file_path('HirePaymentAdvice', hpa_id, f'hpa_{hpa.hpa_number}.pdf')
        cache_mgr.save_pdf_to_disk(pdf_buffer, file_path)
        
        result = {
            'status': TASK_SUCCESS,
            'progress': 100,
            'file_name': f'hpa_{hpa.hpa_number}.pdf',
            'download_url': f'/api/v1/reports/download-hpa/{hpa_id}/',
            'cache_key': pdf_cache_key,
        }
        
        cache.set(cache_key, result, 3600)
        logger.info(f"Successfully generated PDF for HPA {hpa_id}")
        
        return result
        
    except HirePaymentAdvice.DoesNotExist:
        logger.error(f"HPA {hpa_id} not found")
        cache.set(cache_key, {'status': TASK_FAILED, 'error': 'HPA not found'}, 3600)
        return {'status': TASK_FAILED, 'error': 'HPA not found'}
    except Exception as exc:
        logger.error(f"Error generating HPA PDF: {str(exc)}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=2 ** self.request.retries)
        
        cache.set(cache_key, {
            'status': TASK_FAILED,
            'error': f'Failed after {self.max_retries} retries: {str(exc)}'
        }, 3600)
        
        return {'status': TASK_FAILED, 'error': str(exc)}


@shared_task
def cleanup_old_pdfs():
    """Periodic task to cleanup old PDF files"""
    try:
        deleted_count = cleanup_pdfs()
        logger.info(f"Cleanup task completed: deleted {deleted_count} old PDFs")
        return {'status': 'success', 'deleted_count': deleted_count}
    except Exception as e:
        logger.error(f"Cleanup task failed: {str(e)}")
        return {'status': 'failed', 'error': str(e)}


@shared_task
def check_task_status(task_id):
    """Check the status of a PDF generation task"""
    cache_key = f"task_status_{task_id}"
    status = cache.get(cache_key)
    return status or {'status': 'not_found'}
