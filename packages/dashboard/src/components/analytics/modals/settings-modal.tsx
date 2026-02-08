import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/analytics/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldDescription } from '@/components/analytics/ui/field';
import { Button } from '@/components/ui/button';
import type { ApiCredentials } from '@/components/analytics/hooks/use-local-storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: ApiCredentials | null;
  onSave: (credentials: ApiCredentials) => void;
  onClear: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  credentials,
  onSave,
  onClear,
}: SettingsModalProps) {
  const [accountId, setAccountId] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAccountId(credentials?.accountId || '');
      setApiToken(credentials?.apiToken || '');
      setShowToken(false);
    }
  }, [isOpen, credentials]);

  const handleSave = () => {
    if (accountId.trim() && apiToken.trim()) {
      onSave({
        accountId: accountId.trim(),
        apiToken: apiToken.trim(),
      });
      onClose();
    }
  };

  const handleClear = () => {
    onClear();
    setAccountId('');
    setApiToken('');
  };

  const handleClose = () => {
    setAccountId('');
    setApiToken('');
    setShowToken(false);
    onClose();
  };

  const hasCredentials = Boolean(credentials?.accountId && credentials?.apiToken);
  const canSave = accountId.trim() && apiToken.trim();

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>API Settings</AlertDialogTitle>
          <AlertDialogDescription>
            Configure your Cloudflare API credentials. These are stored locally in your browser
            and used to query Analytics Engine data.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
            <p className="font-medium">Why use local API keys?</p>
            <p className="mt-1 text-xs opacity-80">
              When deploying this app publicly, using local API keys ensures only you can query your
              Cloudflare data. Your credentials never leave your browser - they're sent directly to
              Cloudflare's API through the worker.
            </p>
          </div>

          <Field>
            <FieldLabel htmlFor="account-id">Cloudflare Account ID</FieldLabel>
            <FieldDescription>
              Found in your Cloudflare dashboard URL or account settings.
            </FieldDescription>
            <Input
              id="account-id"
              placeholder="e.g., 1234567890abcdef1234567890abcdef"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              autoComplete="off"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="api-token">API Token</FieldLabel>
            <FieldDescription>
              Create a token with "Analytics Read" permissions at{' '}
              <a
                href="https://dash.cloudflare.com/profile/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
              >
                Cloudflare API Tokens
              </a>
            </FieldDescription>
            <div className="flex gap-2">
              <Input
                id="api-token"
                type={showToken ? 'text' : 'password'}
                placeholder="Your Cloudflare API token"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                autoComplete="off"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowToken(!showToken)}
                className="shrink-0"
              >
                {showToken ? 'Hide' : 'Show'}
              </Button>
            </div>
          </Field>

          {hasCredentials && (
            <div className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
              <div className="text-sm text-green-800 dark:text-green-200">
                <p className="font-medium">Credentials configured</p>
                <p className="text-xs opacity-80">
                  Using local API keys for all requests.
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleClear}
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSave} disabled={!canSave}>
            Save
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
