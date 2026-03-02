import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { authenticatedFetch } from "../../utils/api";
import { ReleaseInfo } from "../../types/sharedTypes";

interface VersionUpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    releaseInfo: ReleaseInfo | null;
    currentVersion: string;
    latestVersion: string | null;
}

export default function VersionUpgradeModal({
    isOpen,
    onClose,
    releaseInfo,
    currentVersion,
    latestVersion
}: VersionUpgradeModalProps) {
    const { t } = useTranslation('common');
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateOutput, setUpdateOutput] = useState('');
    const [updateError, setUpdateError] = useState('');
    const [updateSuccess, setUpdateSuccess] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleUpdateNow = useCallback(async () => {
        setIsUpdating(true);
        setUpdateOutput('Starting update...\n');
        setUpdateError('');
        setUpdateSuccess(false);

        try {
            const response = await authenticatedFetch('/api/system/update', {
                method: 'POST',
            });

            const data = await response.json();

            if (response.ok) {
                setUpdateOutput(prev => prev + (data.output || '') + '\n');
                setUpdateOutput(prev => prev + '\nUpdate completed successfully!\n');
                setUpdateOutput(prev => prev + 'Restart the server to apply changes.\n');
                setUpdateSuccess(true);
            } else {
                setUpdateError(data.error || 'Update failed');
                setUpdateOutput(prev => prev + '\nUpdate failed: ' + (data.error || 'Unknown error') + '\n');
            }
        } catch {
            setUpdateError('Network error — could not reach the server.');
            setUpdateOutput(prev => prev + '\nUpdate failed: Network error\n');
        } finally {
            setIsUpdating(false);
        }
    }, []);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText('npm install -g @upfynai-code/app@latest');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <button
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
                aria-label={t('versionUpdate.ariaLabels.closeModal')}
            />

            {/* Modal */}
            <div className="relative bg-card border border-border/40 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">{t('versionUpdate.title')}</h2>
                            <p className="text-xs text-muted-foreground/50">
                                {releaseInfo?.title || t('versionUpdate.newVersionReady')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-muted-foreground/40 hover:text-foreground hover:bg-muted/30 rounded-lg transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Version comparison */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center p-3 bg-muted/20 rounded-xl">
                            <span className="text-xs font-medium text-muted-foreground">{t('versionUpdate.currentVersion')}</span>
                            <span className="text-xs text-foreground font-mono">{currentVersion}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-primary/5 rounded-xl border border-primary/15">
                            <span className="text-xs font-medium text-primary">{t('versionUpdate.latestVersion')}</span>
                            <span className="text-xs text-primary font-mono font-semibold">{latestVersion}</span>
                        </div>
                    </div>

                    {/* Changelog */}
                    {releaseInfo?.body && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-semibold text-foreground">{t('versionUpdate.whatsNew')}</h3>
                                {releaseInfo?.htmlUrl && (
                                    <a
                                        href={releaseInfo.htmlUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-primary hover:underline flex items-center gap-1"
                                    >
                                        {t('versionUpdate.viewFullRelease')}
                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                )}
                            </div>
                            <div className="bg-muted/20 rounded-xl p-3 max-h-48 overflow-y-auto">
                                <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {cleanChangelog(releaseInfo.body)}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Update output */}
                    {updateOutput && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-semibold text-foreground">{t('versionUpdate.updateProgress')}</h3>
                            <div className="bg-background rounded-xl p-3 border border-border/30 max-h-40 overflow-y-auto">
                                <pre className="text-[10px] text-green-400 font-mono whitespace-pre-wrap">{updateOutput}</pre>
                            </div>
                            {updateError && (
                                <div className="px-3 py-2 text-xs text-red-400 bg-red-500/[0.03] border border-red-500/15 rounded-xl">
                                    {updateError}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Manual upgrade instructions (shown when not updating and no output yet) */}
                    {!isUpdating && !updateOutput && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-semibold text-foreground">{t('versionUpdate.manualUpgrade')}</h3>
                            <div
                                className="flex items-center justify-between bg-background rounded-xl p-3 border border-border/30 cursor-pointer hover:border-border/50 transition-colors group"
                                onClick={handleCopy}
                            >
                                <code className="text-xs text-foreground font-mono">
                                    npm install -g @upfynai-code/app@latest
                                </code>
                                <span className="text-[10px] text-muted-foreground/40 group-hover:text-primary transition-colors">
                                    {copied ? 'Copied!' : 'Click to copy'}
                                </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground/40 leading-relaxed">
                                {t('versionUpdate.manualUpgradeHint')}
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 px-5 py-4 border-t border-border/20">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-xs font-medium text-muted-foreground bg-muted/30 hover:bg-muted/50 rounded-xl transition-colors"
                    >
                        {updateSuccess ? t('versionUpdate.buttons.close') : t('versionUpdate.buttons.later')}
                    </button>
                    {!updateOutput && (
                        <>
                            <button
                                onClick={handleCopy}
                                className="flex-1 px-4 py-2.5 text-xs font-medium text-muted-foreground bg-muted/30 hover:bg-muted/50 rounded-xl transition-colors"
                            >
                                {copied ? 'Copied!' : t('versionUpdate.buttons.copyCommand')}
                            </button>
                            <button
                                onClick={handleUpdateNow}
                                disabled={isUpdating}
                                className="flex-1 px-4 py-2.5 text-xs font-medium text-background bg-foreground hover:opacity-90 disabled:opacity-40 rounded-xl transition-opacity flex items-center justify-center gap-2"
                            >
                                {isUpdating ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                                        {t('versionUpdate.buttons.updating')}
                                    </>
                                ) : (
                                    t('versionUpdate.buttons.updateNow')
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

const cleanChangelog = (body: string) => {
    if (!body) return '';
    return body
        .replace(/\b[0-9a-f]{40}\b/gi, '')
        .replace(/(?:^|\s|-)([0-9a-f]{7,10})\b/gi, '')
        .replace(/\*\*Full Changelog\*\*:.*$/gim, '')
        .replace(/https?:\/\/github\.com\/[^\/]+\/[^\/]+\/compare\/[^\s)]+/gi, '')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim();
};
