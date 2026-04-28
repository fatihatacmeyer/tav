import { Component, OnInit, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideUnplug } from '@lucide/angular';
import { DoorService } from './core/services/door';

export interface ApiDoor {
  TerminalID: number;
  TerminalAdi: string;
  GrupAdi: string;
  Durum: number;
  SonGuncelleme: string;
  OlayKodu: string;
}

export interface Door {
  id: number;
  name: string;
  floor: string;
  status: 'closed' | 'opened' | 'leftOpen' | 'disconnected'; 
  isCritical: boolean;
  lastUpdate: Date;
  eventCode: string;
}

export interface SystemLog {
  id: number;
  doorName: string;
  action: string;
  timestamp: Date;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LucideUnplug],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App implements OnInit {
  private doorService = inject(DoorService);
  private cdr = inject(ChangeDetectorRef);
  private pollingTimeoutId: any;
  private isDestroyed = false;
  private previousStatuses: Map<number, string> = new Map();

  criticalDoorIds: number[] = [1069, 1143, 1139, 1002];
  doors: Door[] = [];
  systemLogs: SystemLog[] = [];
  groupedDoors: { [key: string]: Door[] } = {};
  criticalDoors: Door[] = [];
  floors: string[] = [];

  ngOnInit(): void {
    this.startLiveSystem();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    if (this.pollingTimeoutId) {
      clearTimeout(this.pollingTimeoutId);
    }
  }

  async startLiveSystem() {
    this.addLog('Sistem', 'Sistem Başlatılıyor, API Bağlantısı Bekleniyor...');
    
    try {
      const config = await this.doorService.loadConfig();
      const pollTimeMs = (config.pollIntervalSeconds || 1) * 1000;

      const poll = async () => {
        if (this.isDestroyed) return;
        
        await this.refreshData();
        
        if (!this.isDestroyed) {
          this.pollingTimeoutId = setTimeout(poll, pollTimeMs);
        }
      };

      await poll();
    } catch (error) {
      console.error('Config yükleme hatası:', error);
      this.addLog('Sistem', 'Konfigürasyon yüklenemedi!');
    }
  }

  async refreshData() {
    try {
      const apiData = await this.doorService.fetchDoorsFromApi();
      this.mapAndOrganizeData(apiData);
      this.cdr.detectChanges(); // Değişiklikleri hemen yansıt
    } catch (error) {
      console.error('API Hatası:', error);

    }
  }

  mapAndOrganizeData(apiPayload: ApiDoor[]): void {
    //console.log('Mapping API payload:', apiPayload);
    const uniqueApiPayload = Array.from(new Map(apiPayload.map(item => [item.TerminalID, item])).values());

    this.doors = uniqueApiPayload.map((apiItem) => {
      let currentStatus: 'closed' | 'opened' | 'leftOpen' | 'disconnected' = 'closed';
      
      const durum = Number(apiItem.Durum);
      if (durum === -1) {
        currentStatus = 'disconnected';
      } else if (durum === 0) {
        currentStatus = 'closed'; 
      } else if (durum === 1) {
        currentStatus = 'opened'; 
      } else if (durum === 2) {
        currentStatus = 'leftOpen';
      }

      // Durum değişikliği kontrolü ve loglama
      const prevStatus = this.previousStatuses.get(apiItem.TerminalID);
      if (prevStatus && prevStatus !== currentStatus) {
        const actionText = this.getStatusActionText(currentStatus);
        this.addLog(apiItem.TerminalAdi, actionText);
      }
      this.previousStatuses.set(apiItem.TerminalID, currentStatus);

      return {
        id: apiItem.TerminalID,
        name: apiItem.TerminalAdi,
        floor: apiItem.GrupAdi || 'DİĞER',
        status: currentStatus,
        isCritical: this.criticalDoorIds.includes(apiItem.TerminalID),
        lastUpdate: new Date(apiItem.SonGuncelleme),
        eventCode: apiItem.OlayKodu
      };
    });
    //console.log('Mapped doors:', this.doors);

    this.organizeData();
    //console.log('Grouped doors:', this.groupedDoors);
    //console.log('Critical doors:', this.criticalDoors);
  }

  organizeData(): void {
    this.groupedDoors = this.doors.reduce(
      (acc, door) => {
        const floorName = door.floor;
        if (!acc[floorName]) {
          acc[floorName] = [];
        }
        acc[floorName].push(door);
        return acc;
      },
      {} as { [key: string]: Door[] },
    );

    this.floors = Object.keys(this.groupedDoors).sort();
    this.criticalDoors = this.doors.filter((door) => door.isCritical);
  }

  getStatusActionText(status: string): string {
    switch (status) {
      case 'opened': return 'KAPI AÇILDI';
      case 'closed': return 'KAPI KAPANDI';
      case 'leftOpen': return 'KAPI AÇIK KALDI!';
      case 'disconnected': return 'BAĞLANTI KESİLDİ';
      default: return `DURUM: ${status}`;
    }
  }

  getFloors(): string[] {
    return Object.keys(this.groupedDoors);
  }

  addLog(doorName: string, action: string): void {
    const newLog: SystemLog = {
      id: Date.now(),
      doorName: doorName,
      action: action,
      timestamp: new Date(),
    };
    this.systemLogs.unshift(newLog);
  }
}