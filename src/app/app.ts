import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

export interface Door {
  id: number;
  name: string;
  floor: string;
  status: 'closed' | 'open' | 'forced';
  isCritical: boolean;
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
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit {
  doors: Door[] = [
    { id: 1, name: 'Zemin Kat Sağ ACK', floor: 'Zemin Kat', status: 'closed', isCritical: true },
    { id: 2, name: 'Zemin Kat Sol ACK', floor: 'Zemin Kat', status: 'closed', isCritical: true },
    { id: 3, name: 'Salih Altuner', floor: 'Zemin Kat', status: 'closed', isCritical: false },
    { id: 4, name: 'Macro', floor: 'Zemin Kat', status: 'closed', isCritical: false },
    { id: 5, name: 'Bigchefs', floor: 'Cadde', status: 'closed', isCritical: false },
    { id: 6, name: 'Divan', floor: 'Cadde', status: 'closed', isCritical: false },
    { id: 7, name: '1. Kat Beymen Kapısı', floor: '1. Kat', status: 'closed', isCritical: true },
    { id: 8, name: 'Decatlon', floor: '1. Kat', status: 'closed', isCritical: false },
    { id: 9, name: 'LCW Dream', floor: '1. Kat', status: 'closed', isCritical: false },
    { id: 10, name: 'B1 ACK', floor: 'Bodrum', status: 'closed', isCritical: true },
    { id: 11, name: 'B2 ACK', floor: 'Bodrum', status: 'closed', isCritical: true },
    { id: 12, name: 'B3 ACK', floor: 'Bodrum', status: 'closed', isCritical: true },
    { id: 13, name: 'B4 ACK', floor: 'Bodrum', status: 'closed', isCritical: true }
  ];

  systemLogs: SystemLog[] = [];
  groupedDoors: { [key: string]: Door[] } = {};
  criticalDoors: Door[] = [];
  
  isPopupActive: boolean = false;
  alertedDoor: Door | null = null;
  
  alarmAudio: HTMLAudioElement | null = null;
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      this.alarmAudio = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/descent/gotitem.mp3');
    }
  }

  ngOnInit(): void {
    this.organizeData();
    this.addLog('System', 'System Initialized');

    if (this.isBrowser) {
      setInterval(() => {
        this.simulateRandomBreach();
      }, 8000);
    }
  }

  organizeData(): void {
    this.groupedDoors = this.doors.reduce((acc, door) => {
      if (!acc[door.floor]) {
        acc[door.floor] = [];
      }
      acc[door.floor].push(door);
      return acc;
    }, {} as { [key: string]: Door[] });

    this.criticalDoors = this.doors.filter(door => door.isCritical);
  }

  getFloors(): string[] {
    return Object.keys(this.groupedDoors);
  }

  addLog(doorName: string, action: string): void {
    const newLog: SystemLog = {
      id: Date.now(),
      doorName: doorName,
      action: action,
      timestamp: new Date()
    };
    this.systemLogs.unshift(newLog);
  }

  // triggerAlarm(door: Door, status: 'open' | 'forced'): void {
  //   door.status = status;
  //   this.alertedDoor = door;
  //   this.isPopupActive = true;
  //   this.addLog(door.name, status === 'forced' ? 'DOOR FORCED' : 'DOOR OPENED');
    
  //   if (this.isBrowser && this.alarmAudio) {
  //     this.alarmAudio.play().catch(e => console.log('Audio play blocked by browser autoplay policy.', e));
  //   }
  // }

  dismissPopup(): void {
    if (this.alertedDoor) {
        this.addLog(this.alertedDoor.name, 'ALARM ACKNOWLEDGED');
    }
    this.isPopupActive = false;
    this.alertedDoor = null;
    
    // // Sesi durdur ve başa sar
    // if (this.isBrowser && this.alarmAudio) {
    //   this.alarmAudio.pause();
    //   this.alarmAudio.currentTime = 0;
    // }
  }

  simulateRandomBreach(): void {
    if (this.isPopupActive) return; 
    
    const closedDoors = this.doors.filter(d => d.status === 'closed');
    if (closedDoors.length > 0) {
      const randomIndex = Math.floor(Math.random() * closedDoors.length);
      const targetDoor = closedDoors[randomIndex];
      //this.triggerAlarm(targetDoor, 'forced');
    }
  }

  // resetDoor(door: Door): void {
  //     door.status = 'closed';
  //     this.addLog(door.name, 'DOOR CLOSED');
  // }
}