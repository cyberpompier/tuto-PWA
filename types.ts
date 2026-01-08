import React from 'react';

export enum PageId {
  HOME = 'home',
  EXPLORE = 'explore',
  PROFILE = 'profile'
}

export interface PageData {
  id: PageId;
  title: string;
  subtitle: string;
  imageUrl: string;
  description: string;
}

export interface NavigationItem {
  id: PageId;
  label: string;
  icon: (active: boolean) => React.ReactElement;
}