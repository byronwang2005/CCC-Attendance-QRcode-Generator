export type Identity = '' | 'human' | 'agent';
export type TimeMode = 'auto' | 'manual';

export interface ManualTime {
  date: string;
  hour: string;
  minute: string;
}

export interface WizardState {
  identity: Identity;
  url: string;
  timeMode: TimeMode;
  manualTime: ManualTime;
}

export interface ToastState {
  message: string;
  type: 'error' | 'success';
}

export interface QrResult {
  imageUrl?: string;
  generatedTime?: string;
  message?: string;
}
