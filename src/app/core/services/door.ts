import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiDoor } from '../../app';

export interface AppConfig {
  apiUrl: string;
  pollIntervalSeconds: number;
  user: string;
  password: string;
  pageSize: number;
  useDummyData: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DoorService {
  private http = inject(HttpClient);
  private configUrl = '/config.json';
  private appConfig: AppConfig | null = null;

  async loadConfig(): Promise<AppConfig> {
    if (!this.appConfig) {
      //console.log('Loading config from:', this.configUrl);
      this.appConfig = await firstValueFrom(this.http.get<AppConfig>(this.configUrl));
      //console.log('Config loaded:', this.appConfig);
    }
    return this.appConfig;
  }

  async fetchDoorsFromApi(): Promise<ApiDoor[]> {
    const config = await this.loadConfig();

    //console.log('Fetching token from:', `${config.apiUrl}/api/Auth/Token`);
    const tokenResponse: any = await firstValueFrom(
      this.http.post(`${config.apiUrl}/api/Auth/Token`, {
        user: config.user,
        password: config.password,
      }),
    );
    //console.log('Token response:', tokenResponse);

    const token = tokenResponse.token || tokenResponse;

    console.log('Fetching doors from:', `${config.apiUrl}/api/Kapi/getDurum`);
    const headers = new HttpHeaders({
      'X-One-Time-Token': token,
    });

    const doorsData = await firstValueFrom(
      this.http.get<ApiDoor[]>(`${config.apiUrl}/api/Kapi/getDurum`, { headers }),
    );
    console.log('Doors data received:', doorsData);

    return doorsData;
  }

  async fetchHistoryFromApi(
    pageNo: number,
    pageSize: number,
    startDate?: string,
    endDate?: string,
  ): Promise<any> {
    const config = await this.loadConfig();

    const tokenResponse: any = await firstValueFrom(
      this.http.post(`${config.apiUrl}/api/Auth/Token`, {
        user: config.user,
        password: config.password,
      }),
    );

    const token = tokenResponse.token || tokenResponse;

    const headers = new HttpHeaders({
      'X-One-Time-Token': token,
    });

    let url = `${config.apiUrl}/api/Kapi/getGecmisDurum?sayfaNo=${pageNo}&KayitAdet=${pageSize}`;

    if (startDate) {
      url += `&baslangic=${encodeURIComponent(startDate)}`;
    }
    if (endDate) {
      url += `&bitis=${encodeURIComponent(endDate)}`;
    }

    return firstValueFrom(this.http.get<any>(url, { headers }));
  }
}
