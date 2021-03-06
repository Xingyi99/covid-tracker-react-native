import { LifestyleRequest } from '@covid/core/assessment/dto/LifestyleRequest';
import { LifestyleResponse } from '@covid/core/assessment/dto/LifestyleResponse';
import appConfig from '@covid/appConfig';
import { PatientInfosRequest } from '@covid/core/user/dto/UserAPIContracts';

import { IAssessmentRemoteClient } from './AssessmentApiClient';
import { IAssessmentState } from './AssessmentState';
import { AssessmentInfosRequest } from './dto/AssessmentInfosRequest';
import { AssessmentResponse } from './dto/AssessmentInfosResponse';

type AssessmentId = string | null;

export interface IAssessmentService {
  initAssessment(): void;
  saveAssessment(assessmentId: AssessmentId, assessment: Partial<AssessmentInfosRequest>): Promise<AssessmentResponse>;
  completeAssessment(
    assessmentId: AssessmentId,
    assessment: Partial<AssessmentInfosRequest> | null,
    patientInfo: PatientInfosRequest
  ): Promise<boolean>;
  saveLifestyle(patientId: string, payload: Partial<LifestyleRequest>): Promise<LifestyleResponse>;
}

export default class AssessmentService implements IAssessmentService {
  apiClient: IAssessmentRemoteClient;
  state: IAssessmentState;

  constructor(apiClient: IAssessmentRemoteClient, state: IAssessmentState) {
    this.apiClient = apiClient;
    this.state = state;
  }

  private async saveToApi(
    assessmentId: AssessmentId,
    assessment: Partial<AssessmentInfosRequest>
  ): Promise<AssessmentResponse> {
    let response;
    if (assessmentId) {
      response = await this.apiClient.updateAssessment(assessmentId, assessment as AssessmentInfosRequest);
    } else {
      response = await this.apiClient.addAssessment(assessment as AssessmentInfosRequest);
    }
    return response;
  }

  private async sendFullAssessmentToApi() {
    try {
      const assessment = this.state.getAssessment();
      const response = await this.saveToApi(assessment.id!, assessment);
      if (response.id) {
        this.state.updateAssessment({ id: response.id });
      }
      return response;
    } catch (error) {
      throw error;
    }
  }

  private async saveToState(assessment: Partial<AssessmentInfosRequest>) {
    return this.state.updateAssessment(assessment);
  }

  initAssessment() {
    this.state.initAssessment();
  }

  async saveAssessment(
    assessmentId: AssessmentId,
    assessment: Partial<AssessmentInfosRequest>
  ): Promise<AssessmentResponse> {
    await this.saveToState(assessment);
    return {} as AssessmentResponse; // To fulfil interface requirement.
  }

  async completeAssessment(
    assessmentId: AssessmentId,
    assessment: Partial<AssessmentInfosRequest> | null = null,
    patientInfo: PatientInfosRequest
  ): Promise<boolean> {
    if (assessment) {
      if (patientInfo.current_country_code) {
        assessment.current_country_code = patientInfo.current_country_code;
      } else {
        if (patientInfo.current_postcode) {
          assessment.current_postcode = patientInfo.current_postcode;
        } else {
          assessment.current_postcode = patientInfo.postcode;
        }
      }

      await this.saveAssessment(assessmentId, assessment);
    }

    const response = this.sendFullAssessmentToApi();
    return !!response;
  }

  async saveLifestyle(patientId: string, lifestyle: Partial<LifestyleRequest>): Promise<LifestyleResponse> {
    const response = await this.apiClient.addLifeStyle(patientId, {
      ...lifestyle,
      version: appConfig.lifestyleVersion,
    } as LifestyleRequest);
    return response;
  }
}
