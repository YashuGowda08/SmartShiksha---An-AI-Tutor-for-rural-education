import Dexie, { Table } from 'dexie';

export interface OfflineSubject {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  classes: string[];
  board: string;
}

export interface OfflineChapter {
  id: string;
  subject_id: string;
  student_class: string;
  board: string;
  name: string;
  description: string;
  order_index: number;
}

export interface OfflineTopic {
  id: string;
  chapter_id: string;
  name: string;
  explanation: string;
  examples: string;
  order_index: number;
  language: string;
}

export class SmartShikshaDB extends Dexie {
  subjects!: Table<OfflineSubject>;
  chapters!: Table<OfflineChapter>;
  topics!: Table<OfflineTopic>;

  constructor() {
    super('SmartShikshaDB');
    this.version(1).stores({
      subjects: 'id, name, board',
      chapters: 'id, subject_id, student_class, board',
      topics: 'id, chapter_id, language'
    });
  }
}

export const db = new SmartShikshaDB();
