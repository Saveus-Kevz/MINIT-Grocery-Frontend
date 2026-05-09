import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Eye, EyeOff, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: number;
    token: string;
    onSuccess: (message: string) => void;
    onError: (message: string) => void;
}

export function ChangePasswordModal({
                                        isOpen,
                                        onClose,
                                        userId,
                                        token,
                                        onSuccess,
                                        onError,
                                    }: ChangePasswordModalProps) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState<{
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
    }>({});

    const API_BASE = "http://localhost:8086/api";

    const validateForm = () => {
        const errors: typeof validationErrors = {};

        if (!currentPassword) {
            errors.currentPassword = "Current password is required";
        }

        if (!newPassword) {
            errors.newPassword = "New password is required";
        } else if (newPassword.length < 8) {
            errors.newPassword = "Password must be at least 8 characters";
        } else if (newPassword.length > 100) {
            errors.newPassword = "Password must be less than 100 characters";
        } else if (/\s/.test(newPassword)) {
            errors.newPassword = "Password cannot contain spaces";
        } else if (!/(?=.*[0-9])/.test(newPassword)) {
            errors.newPassword = "Password must contain at least one number (0-9)";
        } else if (!/(?=.*[a-z])/.test(newPassword)) {
            errors.newPassword = "Password must contain at least one lowercase letter (a-z)";
        } else if (!/(?=.*[A-Z])/.test(newPassword)) {
            errors.newPassword = "Password must contain at least one uppercase letter (A-Z)";
        } else if (!/(?=.*[@#$%^&+=])/.test(newPassword)) {
            errors.newPassword = "Password must contain at least one special character (@#$%^&+=)";
        }

        if (!confirmPassword) {
            errors.confirmPassword = "Please confirm your new password";
        } else if (newPassword !== confirmPassword) {
            errors.confirmPassword = "Passwords do not match";
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE}/users/${userId}/change-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    confirmPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.detail || "Failed to change password");
            }

            onSuccess("Password changed successfully! Please log in again.");
            onClose();

            // Clear form
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setValidationErrors({});

        } catch (err) {
            onError(err instanceof Error ? err.message : "Failed to change password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl"
                    >
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-[#6C35D4] to-[#B28DFF]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                                    <Lock className="w-5 h-5 text-white" />
                                </div>
                                <h2 className="text-xl font-bold text-white">Change Password</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-all text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Current Password */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                                    Current Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? "text" : "password"}
                                        className={cn(
                                            "w-full bg-[#F2EDFF]/30 border rounded-2xl px-5 py-3.5 pr-12 focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/20 transition-all",
                                            validationErrors.currentPassword
                                                ? "border-red-500 focus:ring-red-500/20"
                                                : "border-[#6C35D4]/10 focus:border-[#6C35D4]"
                                        )}
                                        placeholder="Enter current password"
                                        value={currentPassword}
                                        onChange={(e) => {
                                            setCurrentPassword(e.target.value);
                                            if (validationErrors.currentPassword) {
                                                setValidationErrors(prev => ({ ...prev, currentPassword: undefined }));
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#6C35D4] transition-all"
                                    >
                                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {validationErrors.currentPassword && (
                                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {validationErrors.currentPassword}
                                    </p>
                                )}
                            </div>

                            {/* New Password */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        className={cn(
                                            "w-full bg-[#F2EDFF]/30 border rounded-2xl px-5 py-3.5 pr-12 focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/20 transition-all",
                                            validationErrors.newPassword
                                                ? "border-red-500 focus:ring-red-500/20"
                                                : "border-[#6C35D4]/10 focus:border-[#6C35D4]"
                                        )}
                                        placeholder="Enter new password"
                                        value={newPassword}
                                        onChange={(e) => {
                                            setNewPassword(e.target.value);
                                            if (validationErrors.newPassword) {
                                                setValidationErrors(prev => ({ ...prev, newPassword: undefined }));
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#6C35D4] transition-all"
                                    >
                                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {validationErrors.newPassword && (
                                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {validationErrors.newPassword}
                                    </p>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        className={cn(
                                            "w-full bg-[#F2EDFF]/30 border rounded-2xl px-5 py-3.5 pr-12 focus:outline-none focus:ring-2 focus:ring-[#6C35D4]/20 transition-all",
                                            validationErrors.confirmPassword
                                                ? "border-red-500 focus:ring-red-500/20"
                                                : "border-[#6C35D4]/10 focus:border-[#6C35D4]"
                                        )}
                                        placeholder="Confirm your new password"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            if (validationErrors.confirmPassword) {
                                                setValidationErrors(prev => ({ ...prev, confirmPassword: undefined }));
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#6C35D4] transition-all"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {validationErrors.confirmPassword && (
                                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {validationErrors.confirmPassword}
                                    </p>
                                )}
                            </div>

                            {/* Password Requirements Hint */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    Password Requirements:
                                </p>
                                <ul className="text-xs text-gray-500 space-y-1">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                                        Minimum 8 characters, maximum 100 characters
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                                        At least one uppercase letter (A-Z)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                                        At least one lowercase letter (a-z)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                                        At least one number (0-9)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                                        At least one special character (@#$%^&+=)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                                        No spaces allowed
                                    </li>
                                </ul>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4 pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 bg-[#6C35D4] text-white py-4 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#4B2491] shadow-xl shadow-[#6C35D4]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Changing...
                                        </>
                                    ) : (
                                        "Change Password"
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-6 py-4 bg-gray-50 text-gray-400 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-gray-100 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}