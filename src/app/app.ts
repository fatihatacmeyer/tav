import { Component, OnInit, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideUnplug } from '@lucide/angular';
import { DoorService } from './core/services/door';

export interface ApiDoor {
  TerminalID: number;
  TerminalAdi: string;
  GrupAdi: string;
  Durum: number;
  SonGuncelleme: string;
  OlayKodu: string;
  Amac: number;
}
export interface AlertNotification {
  id: number;
  doorName: string;
}
export interface Door {
  id: number;
  uniqueKey: string;
  name: string;
  floor: string;
  status: 'closed' | 'opened' | 'leftOpen' | 'disconnected'; 
  isCritical: boolean;
  isNormal: boolean;
  lastUpdate: Date;
  eventCode: string;
}

export interface SystemLog {
  id: number;
  doorName: string;
  action: string;
  status?: number;
  timestamp: Date;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LucideUnplug, FormsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App implements OnInit {
  private doorService = inject(DoorService);
  private cdr = inject(ChangeDetectorRef);
  private pollingTimeoutId: any;
  private isDestroyed = false;
  private previousStatuses: Map<number, string> = new Map();

  doors: Door[] = [];
  systemLogs: SystemLog[] = [];
  groupedDoors: { [key: string]: Door[] } = {};
  criticalDoors: Door[] = [];
  floors: string[] = [];
  sidebarTitle: string = 'Kritik Kapılar Takibi';
activeNotifications: AlertNotification[] = [];
  historyLogs: any[] = [];
  isHistoryModalOpen: boolean = false;
  currentPage: number = 1;
  totalPages: number = 0;
  totalRecords: number = 0;
  pageSize: number = 3;

  searchTerm: string = '';
  groupFilter: string = '';
  historySearchTerm: string = '';
  historyGroupFilter: string = '';
isLightMode: boolean = false;
  availableGroups: string[] = [];
  availableHistoryGroups: string[] = [];

  startDate: string = '';
  endDate: string = '';

  async ngOnInit(): Promise<void> {
if (typeof window !== 'undefined' && localStorage) {
      const savedTheme = localStorage.getItem('themePreference');
      if (savedTheme === 'light') {
        this.isLightMode = true;
      }
    }
    const config = await this.doorService.loadConfig();
    this.pageSize = config.pageSize || 3;
    
    this.initDates();
    this.startLiveSystem();
    this.fetchHistory(1, 5,true); // İlk açılışta ana ekran için sadece 5 kayıt çekelim
  }

toggleTheme(): void {
    this.isLightMode = !this.isLightMode;
    
    // Değişimi kaydet
    if (typeof window !== 'undefined' && localStorage) {
      localStorage.setItem('themePreference', this.isLightMode ? 'light' : 'dark');
    }
  }
showLeftOpenAlert(doorName: string) {
  
    const audio = new Audio('alert.mp3'); 
    audio.play().catch(e => console.warn('Ses çalınamadı (Tarayıcı engeli olabilir):', e));

    const newAlert: AlertNotification = {
      id: Date.now() + Math.random(),
      doorName: doorName
    };

    // 3. En üste ekle
    this.activeNotifications.unshift(newAlert);

    // 4. Eğer 4'ten fazla olduysa en sondakini (en eskiyi) sil
    if (this.activeNotifications.length > 4) {
      this.activeNotifications.pop();
    }

    // 5. 3 Saniye sonra bu bildirimi diziden çıkar
    setTimeout(() => {
      this.activeNotifications = this.activeNotifications.filter(n => n.id !== newAlert.id);
      this.cdr.detectChanges(); // Arayüzü güncelle
    }, 3000);
  }
  initDates() {
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);

    this.endDate = this.formatDate(today);
    this.startDate = this.formatDate(lastWeek);
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
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
    if (!apiPayload || !Array.isArray(apiPayload)) {
      console.warn('API payload geçerli bir dizi değil:', apiPayload);
      return;
    }

    // Hem TerminalID hem de Amac bilgisini kullanarak gerçek bir tekilleştirme yapalım
    // Böylece aynı kapı farklı amaçlarla (30 ve 31) listede yer alabilir.
    const uniqueApiPayload = Array.from(new Map(apiPayload.map(item => [`${item.TerminalID}-${item.Amac}`, item])).values());

    const titleEntry = apiPayload.find(item => Number(item.Amac) === 31);
    if (titleEntry) {
      this.sidebarTitle = titleEntry.GrupAdi;
    }

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
        const statusNum = Number(apiItem.Durum);
        this.addLog(apiItem.TerminalAdi, actionText, statusNum);
        if (currentStatus === 'leftOpen') {
          this.showLeftOpenAlert(apiItem.TerminalAdi);
        }
      }
      this.previousStatuses.set(apiItem.TerminalID, currentStatus);

      const amac = apiItem.Amac !== undefined ? Number(apiItem.Amac) : 0;
      
      const mappedDoor: Door = {
        id: apiItem.TerminalID,
        uniqueKey: `${apiItem.TerminalID}-${amac}`,
        name: apiItem.TerminalAdi,
        floor: apiItem.GrupAdi || 'DİĞER',
        status: currentStatus,
        isCritical: amac === 31,
        isNormal: amac === 30,
        lastUpdate: apiItem.SonGuncelleme ? new Date(apiItem.SonGuncelleme) : new Date(),
        eventCode: apiItem.OlayKodu || ''
      };

      if (mappedDoor.isCritical) {
        console.log('Kritik kapı bulundu:', mappedDoor.name, 'Amac:', amac);
      }

      return mappedDoor;
    });

    this.organizeData();
    console.log('Mapping tamamlandı. Toplam Kapı:', this.doors.length, 'Kritik:', this.criticalDoors.length);
    
    // Mevcut grupları combobox için toplayalım
    this.availableGroups = [...new Set(this.doors.map(d => d.floor))].sort();
  }

  organizeData(): void {
    let filteredDoors = this.doors;
    
    if (this.searchTerm || this.groupFilter) {
      filteredDoors = this.doors.filter(door => {
        const matchesSearch = !this.searchTerm || door.name.toLowerCase().includes(this.searchTerm.toLowerCase());
        const matchesGroup = !this.groupFilter || door.floor.toLowerCase().includes(this.groupFilter.toLowerCase());
        return matchesSearch && matchesGroup;
      });
    }

    const normalDoors = filteredDoors.filter(door => door.isNormal);
    
    this.groupedDoors = normalDoors.reduce(
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
    this.criticalDoors = filteredDoors.filter((door) => door.isCritical);
  }

  onFilterChange() {
    this.organizeData();
    this.cdr.detectChanges();
  }

  get filteredHistoryLogs() {
    if (!this.historySearchTerm && !this.historyGroupFilter) return this.historyLogs;
    
    return this.historyLogs.filter(log => {
      const matchesSearch = !this.historySearchTerm || log.TerminalAdi.toLowerCase().includes(this.historySearchTerm.toLowerCase());
      const matchesGroup = !this.historyGroupFilter || log.GrupAdi.toLowerCase().includes(this.historyGroupFilter.toLowerCase());
      return matchesSearch && matchesGroup;
    });
  }

  getHistoryStatusClass(durum: number): string {
    const d = Number(durum);
    if (d === 0) return 'bg-green';
    if (d === 1) return 'bg-orange';
    if (d === 2) return 'bg-red';
    return 'bg-gray';
  }

  getHistoryStatusText(durum: number): string {
    const d = Number(durum);
    if (d === 0) return 'KAPI KAPANDI';
    if (d === 1) return 'KAPI AÇILDI';
    if (d === 2) return 'KAPI AÇIK KALDI';
    return 'BİLİNMİYOR';
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

  async fetchHistory(page: number, customPageSize?: number, updateSystemLogs: boolean = false) {
    try {
      if (!this.validateDateRange()) {
        return;
      }

      const size = customPageSize || this.pageSize;
      this.currentPage = page;
      const response = await this.doorService.fetchHistoryFromApi(
        page, 
        size,
        this.startDate ? `${this.startDate}T00:00:00` : undefined,
        this.endDate ? `${this.endDate}T23:59:59` : undefined
      );
      
      if (Array.isArray(response)) {
        this.historyLogs = response;
        this.totalRecords = response.length > 0 ? response[0].ToplamKayitSayisi : 0;
        
        // SADECE updateSystemLogs true ise ana sayfadaki tabloyu güncelle
        if (updateSystemLogs && page === 1) {
          this.systemLogs = response.map((h: any) => ({
            id: h.LogID,
            doorName: h.TerminalAdi,
            action: this.getHistoryStatusText(h.Durum),
            status: h.Durum,
            timestamp: new Date(h.SonGuncelleme)
          }));
        }
      } else if (response && response.Liste) {
        this.historyLogs = response.Liste;
        this.totalRecords = response.ToplamKayitSayisi || 0;

        // API'den Liste objesi dönerse diye buraya da aynı korumayı ekliyoruz
        if (updateSystemLogs && page === 1) {
          this.systemLogs = this.historyLogs.map((h: any) => ({
            id: h.LogID,
            doorName: h.TerminalAdi,
            action: this.getHistoryStatusText(h.Durum),
            status: h.Durum,
            timestamp: new Date(h.SonGuncelleme)
          }));
        }
      } else {
        this.historyLogs = [];
        this.totalRecords = 0;
      }

      this.availableHistoryGroups = [...new Set(this.historyLogs.map(l => l.GrupAdi))].sort();
      this.totalPages = Math.ceil(this.totalRecords / this.pageSize) || 1;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Geçmiş yükleme hatası:', error);
    }
  }

  openHistoryModal() {
    this.isHistoryModalOpen = true;
    this.fetchHistory(1);
  }

  closeHistoryModal() {
    this.isHistoryModalOpen = false;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.fetchHistory(this.currentPage + 1);
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.fetchHistory(this.currentPage - 1);
    }
  }

  validateDateRange(): boolean {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    
    if (start > end) {
      alert('Başlangıç tarihi bitiş tarihinden sonra olamaz!');
      return false;
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 31) {
      alert('Tarih aralığı en fazla 1 ay (31 gün) olabilir!');
      return false;
    }

    return true;
  }

 addLog(doorName: string, action: string, status?: number): void {
    const newLog: SystemLog = {
      id: Date.now(),
      doorName: doorName,
      action: action,
      status: status,
      timestamp: new Date(),
    };
    this.systemLogs.unshift(newLog);
    
    // Listeyi her zaman son 5 kayıtta tut
    if (this.systemLogs.length > 5) {
      this.systemLogs.pop();
    }
  }
}