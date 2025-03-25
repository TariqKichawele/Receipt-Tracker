'use client'

import React, { useCallback, useRef, useState } from 'react'
import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useSchematicEntitlement } from '@schematichq/schematic-react';
import { uploadPDF } from '@/actions/uploadPDF';
import { AlertCircle, CheckCircle, CloudUpload } from 'lucide-react';
import { Button } from './ui/button';
const PDFDropzone = () => {
    const [isDraggingOver, setDraggingOver] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { user } = useUser();
    const router = useRouter();
    const sensors = useSensors(useSensor(PointerSensor));
    const {
        value: isFeatureEnabled,
        featureUsageExceeded,
        featureAllocation
    } = useSchematicEntitlement("scan");

    const handleUpload = useCallback( async (files: FileList | File[]) => {
        if (!user) {
            alert("You must be signed in to upload files");
            return;
        }

        const fileArray = Array.from(files);
        const pdfFiles = fileArray.filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));

        if (pdfFiles.length === 0) {
            alert("Please select a PDF file");
            return;
        }

        setIsUploading(true);

        try {
            const newUploadedFiles: string[] = [];

            for (const file of pdfFiles) {
                const formData = new FormData();
                formData.append('file', file);

                const res = await uploadPDF(formData);

                if(!res.success) {
                    throw new Error(res.error);
                }

                newUploadedFiles.push(file.name);
            }

            setUploadedFiles((prevFiles) => [...prevFiles, ...newUploadedFiles]);

            setTimeout(() => {
                setUploadedFiles([])
            }, 5000);

            router.push("/receipts");
        } catch (error) {
            console.error("Error uploading files:", error);
        } finally {
            setIsUploading(false);
        }
    }, [user, router])

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDraggingOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDraggingOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDraggingOver(false);

        if (!user) {
            alert("You must be signed in to upload files");
            return;
        }

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleUpload(e.dataTransfer.files);
        }
    }, [user, handleUpload]);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleUpload(e.target.files);
        }
    }, [handleUpload]);

    const triggerFileInput = useCallback(() => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    }, []);

    const canUpload = true;
    const isUserSignedIn = !!user;

  return (
    <DndContext sensors={sensors}>
        <div className='w-full max-w-md mx-auto'>
            <div
                onDragOver={canUpload ? handleDragOver : undefined}
                onDragLeave={canUpload ? handleDragLeave : undefined}
                onDrop={canUpload ? handleDrop : (e) => e.preventDefault()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors 
                    ${isDraggingOver ? "border-blue-500 bg-blue-50" : "border-gray-300"} 
                    ${!canUpload ? "opacity-70 cursor-not-allowed" : ""}
                `}
            >
                {isUploading ? (
                    <div className='flex flex-col items-center'>
                        <div className='animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-2'></div>
                        <p>Uploading...</p>
                    </div>
                ) : !isUserSignedIn ? (
                    <>
                        <CloudUpload className='mx-auto h-12 w-12 text-gray-400' />
                        <p className='mt-2 text-sm text-gray-600'>
                            Please sign in to upload files
                        </p>
                    </>
                ) : (
                    <>
                        <CloudUpload className='mx-auto h-12 w-12 text-gray-400' />
                        <p className='mt-2 text-sm text-gray-600'>
                            Drag and drop PDF files here, or click to select files
                        </p>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            accept='application/pdf, .pdf'
                            multiple
                            onChange={handleFileInputChange}
                            className='hidden' 
                        />
                        <Button
                            className='mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed'
                            disabled={!isFeatureEnabled}
                            onClick={triggerFileInput}
                        >
                            {isFeatureEnabled ? "Upload Files" : "Upgrade Plan"}
                        </Button>
                    </>
                )}
            </div>

            <div className='mt-4'>
                {featureUsageExceeded && (
                    <div className='flex items-center p-3 bg-red-50 border border-red-200 rounded-md text-red-600'>
                        <AlertCircle className='h-5 w-5 flex-shrink-8' />
                        <span>
                            You have exceeded your limit of {featureAllocation} scans per month. Please upgrade your plan to continue using our service.
                        </span>
                    </div>
                )}
            </div>

            {uploadedFiles.length > 0 && (
                <div className='mt-4'>
                    <h3 className='font-medium'>Uploaded files:</h3>
                    <ul className='mt-2 text-sm text-gray-600 space-y-1'>
                        {uploadedFiles.map((fileName, index) => (
                            <li key={index} className='flex items-center'>
                                <CheckCircle className='h-5 w-5 text-green-500 mr-2' />
                                {fileName}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    </DndContext>
  )
}

export default PDFDropzone