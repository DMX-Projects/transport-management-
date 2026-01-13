"""
PDF Generator Utils - Optimized PDF generation with caching
"""
import os
import hashlib
from io import BytesIO
from pathlib import Path
from django.conf import settings
from django.core.cache import cache
from django.core.files.storage import default_storage
import logging

logger = logging.getLogger(__name__)


class PDFCacheManager:
    """Manages PDF caching and temporary storage"""
    
    @staticmethod
    def get_pdf_cache_key(model_name, pk, version=None):
        """Generate unique cache key for PDF"""
        key = f"pdf_{model_name}_{pk}"
        if version:
            key += f"_{version}"
        return key
    
    @staticmethod
    def get_pdf_file_path(model_name, pk, filename=None):
        """Get file path for storing generated PDF"""
        pdf_dir = Path(settings.PDF_STORAGE_PATH)
        pdf_dir.mkdir(parents=True, exist_ok=True)
        
        if filename is None:
            filename = f"{model_name}_{pk}.pdf"
        
        return str(pdf_dir / filename)
    
    @staticmethod
    def cache_pdf(cache_key, pdf_buffer, timeout=None):
        """Cache PDF buffer in Redis"""
        if timeout is None:
            timeout = settings.PDF_CACHE_TIMEOUT
        
        try:
            # Store binary data directly in cache
            cache.set(cache_key, pdf_buffer, timeout)
            logger.info(f"PDF cached with key: {cache_key}")
        except Exception as e:
            logger.error(f"Failed to cache PDF: {str(e)}")
    
    @staticmethod
    def get_cached_pdf(cache_key):
        """Retrieve cached PDF buffer"""
        try:
            pdf_buffer = cache.get(cache_key)
            if pdf_buffer:
                logger.info(f"Retrieved PDF from cache: {cache_key}")
            return pdf_buffer
        except Exception as e:
            logger.error(f"Failed to retrieve cached PDF: {str(e)}")
            return None
    
    @staticmethod
    def save_pdf_to_disk(pdf_buffer, file_path):
        """Save PDF buffer to disk"""
        try:
            Path(file_path).parent.mkdir(parents=True, exist_ok=True)
            with open(file_path, 'wb') as f:
                f.write(pdf_buffer.getvalue() if isinstance(pdf_buffer, BytesIO) else pdf_buffer)
            logger.info(f"PDF saved to disk: {file_path}")
            return file_path
        except Exception as e:
            logger.error(f"Failed to save PDF to disk: {str(e)}")
            return None
    
    @staticmethod
    def load_pdf_from_disk(file_path):
        """Load PDF from disk into BytesIO"""
        try:
            if os.path.exists(file_path):
                with open(file_path, 'rb') as f:
                    return BytesIO(f.read())
            return None
        except Exception as e:
            logger.error(f"Failed to load PDF from disk: {str(e)}")
            return None
    
    @staticmethod
    def delete_cached_pdf(cache_key):
        """Delete PDF from cache"""
        try:
            cache.delete(cache_key)
            logger.info(f"PDF cache deleted: {cache_key}")
        except Exception as e:
            logger.error(f"Failed to delete cached PDF: {str(e)}")


class PDFOptimizer:
    """Optimize PDF generation and delivery"""
    
    @staticmethod
    def get_optimized_pdf_response(pdf_buffer, filename):
        """
        Prepare optimized PDF response with proper headers
        """
        from django.http import FileResponse
        
        pdf_buffer.seek(0)
        response = FileResponse(
            pdf_buffer,
            as_attachment=True,
            filename=filename,
            content_type='application/pdf'
        )
        
        # Optimize headers for streaming
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Content-Type'] = 'application/pdf'
        response['Cache-Control'] = 'max-age=3600, must-revalidate'
        response['Content-Length'] = pdf_buffer.getbuffer().nbytes
        response['Accept-Ranges'] = 'bytes'
        
        return response
    
    @staticmethod
    def compress_pdf_buffer(pdf_buffer):
        """
        Attempt to compress PDF buffer (if pypdf is available)
        """
        try:
            from pypdf import PdfWriter, PdfReader
            
            pdf_buffer.seek(0)
            reader = PdfReader(pdf_buffer)
            writer = PdfWriter()
            
            for page in reader.pages:
                page.compress_content_streams()
                writer.add_page(page)
            
            compressed_buffer = BytesIO()
            writer.write(compressed_buffer)
            compressed_buffer.seek(0)
            
            original_size = pdf_buffer.getbuffer().nbytes
            compressed_size = compressed_buffer.getbuffer().nbytes
            compression_ratio = (1 - compressed_size / original_size) * 100
            
            logger.info(f"PDF compressed: {original_size}B -> {compressed_size}B ({compression_ratio:.2f}%)")
            
            return compressed_buffer if compression_ratio > 5 else pdf_buffer
        except ImportError:
            logger.warning("pypdf not installed, skipping compression")
            return pdf_buffer
        except Exception as e:
            logger.error(f"Failed to compress PDF: {str(e)}")
            return pdf_buffer


class PDFGenerator:
    """Base class for PDF generation with caching"""
    
    def __init__(self, model_instance, enable_cache=True):
        self.model_instance = model_instance
        self.enable_cache = enable_cache
        self.cache_manager = PDFCacheManager()
        self.optimizer = PDFOptimizer()
    
    def generate(self):
        """
        Generate PDF with caching strategy:
        1. Check cache
        2. Check disk
        3. Generate new
        """
        cache_key = self._get_cache_key()
        
        # Check cache first
        if self.enable_cache:
            cached_pdf = self.cache_manager.get_cached_pdf(cache_key)
            if cached_pdf:
                return cached_pdf
        
        # Check disk storage
        file_path = self.cache_manager.get_pdf_file_path(
            self.model_instance.__class__.__name__,
            self.model_instance.pk
        )
        
        if os.path.exists(file_path):
            pdf_buffer = self.cache_manager.load_pdf_from_disk(file_path)
            if pdf_buffer:
                # Re-cache for performance
                if self.enable_cache:
                    self.cache_manager.cache_pdf(cache_key, pdf_buffer)
                return pdf_buffer
        
        # Generate new PDF
        pdf_buffer = self._generate_pdf()
        
        # Store and cache
        if self.enable_cache:
            self.cache_manager.cache_pdf(cache_key, pdf_buffer)
        self.cache_manager.save_pdf_to_disk(pdf_buffer, file_path)
        
        return pdf_buffer
    
    def _get_cache_key(self):
        """Override in subclass"""
        return self.cache_manager.get_pdf_cache_key(
            self.model_instance.__class__.__name__,
            self.model_instance.pk
        )
    
    def _generate_pdf(self):
        """Override in subclass"""
        raise NotImplementedError


def cleanup_old_pdfs(days=None):
    """Delete PDF files older than specified days"""
    if days is None:
        days = settings.PDF_CLEANUP_DAYS
    
    import time
    
    pdf_dir = Path(settings.PDF_STORAGE_PATH)
    if not pdf_dir.exists():
        return 0
    
    current_time = time.time()
    deleted_count = 0
    
    for file_path in pdf_dir.glob('*.pdf'):
        file_age = (current_time - file_path.stat().st_mtime) / 86400
        if file_age > days:
            try:
                file_path.unlink()
                deleted_count += 1
                logger.info(f"Deleted old PDF: {file_path}")
            except Exception as e:
                logger.error(f"Failed to delete PDF: {str(e)}")
    
    logger.info(f"Cleaned up {deleted_count} old PDF files")
    return deleted_count
