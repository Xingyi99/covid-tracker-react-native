import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Formik, FormikProps } from 'formik';
import { Form } from 'native-base';
import React, { Component } from 'react';
import * as Yup from 'yup';

import DropdownField from '@covid/components/DropdownField';
import { GenericTextField } from '@covid/components/GenericTextField';
import ProgressStatus from '@covid/components/ProgressStatus';
import Screen, { Header, ProgressBlock } from '@covid/components/Screen';
import { BrandedButton, ErrorText, HeaderText } from '@covid/components/Text';
import { ValidationError } from '@covid/components/ValidationError';
import { isUSCountry, ILocalisationService } from '@covid/core/localisation/LocalisationService';
import { PatientInfosRequest } from '@covid/core/user/dto/UserAPIContracts';
import { AtopyData, AtopyQuestions } from '@covid/features/patient/fields/AtopyQuestions';
import i18n from '@covid/locale/i18n';
import patientCoordinator from '@covid/core/patient/PatientCoordinator';
import YesNoField from '@covid/components/YesNoField';
import { lazyInject } from '@covid/provider/services';
import { Services } from '@covid/provider/services.types';
import { IPatientService } from '@covid/core/patient/PatientService';
import { BloodGroupData, BloodGroupQuestion } from '@covid/features/patient/fields/BloodGroupQuestion';
import { stripAndRound } from '@covid/utils/number';

import { ScreenParamList } from '../ScreenParamList';

import { BloodPressureData, BloodPressureMedicationQuestion } from './fields/BloodPressureMedicationQuestion';
import { HormoneTreatmentData, HormoneTreatmentQuestion, TreatmentValue } from './fields/HormoneTreatmentQuestion';
import { PeriodData, PeriodQuestion, periodValues } from './fields/PeriodQuestion';
import {
  SupplementValue,
  supplementValues,
  VitaminSupplementData,
  VitaminSupplementsQuestion,
} from './fields/VitaminQuestion';
import { DiabetesQuestions, DiabetesData } from './fields/DiabetesQuestions';

export interface YourHealthData
  extends BloodPressureData,
    PeriodData,
    HormoneTreatmentData,
    VitaminSupplementData,
    AtopyData,
    DiabetesData,
    BloodGroupData {
  isPregnant: string;
  hasHeartDisease: string;
  hasDiabetes: string;
  smokerStatus: string;
  smokedYearsAgo: string;
  hasKidneyDisease: string;

  hasCancer: string;
  cancerType: string;

  doesChemiotherapy: string;
  takesImmunosuppressants: string;
  takesAspirin: string;
  takesCorticosteroids: string;

  limitedActivity: string;
}

const initialFormValues = {
  isPregnant: 'no',
  hasHeartDisease: 'no',
  hasDiabetes: 'no',
  smokerStatus: 'never',
  smokedYearsAgo: '',
  hasKidneyDisease: 'no',

  hasCancer: 'no',
  cancerType: '',

  doesChemiotherapy: 'no',
  takesImmunosuppressants: 'no',
  takesCorticosteroids: 'no',
  takesAspirin: 'no',

  limitedActivity: 'no',
};

type HealthProps = {
  navigation: StackNavigationProp<ScreenParamList, 'YourHealth'>;
  route: RouteProp<ScreenParamList, 'YourHealth'>;
};

type State = {
  errorMessage: string;
  showPregnancyQuestion: boolean;
  showPeriodQuestion: boolean;
  showHormoneTherapyQuestion: boolean;
  showDiabetesQuestion: boolean;
};

const initialState: State = {
  errorMessage: '',
  showPregnancyQuestion: false,
  showPeriodQuestion: false,
  showHormoneTherapyQuestion: false,
  showDiabetesQuestion: false,
};

export default class YourHealthScreen extends Component<HealthProps, State> {
  @lazyInject(Services.Patient)
  private readonly patientService: IPatientService;

  @lazyInject(Services.Localisation)
  private readonly localisationService: ILocalisationService;

  constructor(props: HealthProps) {
    super(props);
    const currentPatient = patientCoordinator.patientData.patientState;
    const features = this.localisationService.getConfig();
    this.state = {
      ...initialState,
      showPregnancyQuestion: features.showPregnancyQuestion && currentPatient.isFemale,
      showPeriodQuestion: currentPatient.isPeriodCapable,
      showHormoneTherapyQuestion: currentPatient.isPeriodCapable,
      showDiabetesQuestion: false,
    };
  }

  registerSchema = Yup.object().shape({
    isPregnant: Yup.string().when([], {
      is: () => this.state.showPregnancyQuestion,
      then: Yup.string().required(),
    }),
    havingPeriods: Yup.string().when([], {
      is: () => this.state.showPeriodQuestion,
      then: Yup.string().required(i18n.t('your-health.please-select-periods')),
    }),
    periodFrequency: Yup.string().when('havingPeriods', {
      is: periodValues.CURRENTLY,
      then: Yup.string().required(i18n.t('your-health.please-select-period-frequency')),
    }),
    weeksPregnant: Yup.number().when('havingPeriods', {
      is: periodValues.PREGNANT,
      then: Yup.number()
        .typeError(i18n.t('your-health.correct-weeks-pregnant'))
        .min(0, i18n.t('your-health.correct-weeks-pregnant'))
        .max(50, i18n.t('your-health.correct-weeks-pregnant')),
    }),
    periodStoppedAge: Yup.number().when('havingPeriods', {
      is: periodValues.STOPPED,
      then: Yup.number()
        .typeError(i18n.t('your-health.correct-period-stopped-age'))
        .min(0, i18n.t('your-health.correct-period-stopped-age'))
        .max(100, i18n.t('your-health.correct-period-stopped-age')),
    }),
    hormoneTreatment: Yup.array<string>().when([], {
      is: () => this.state.showHormoneTherapyQuestion,
      then: Yup.array<string>().min(1, i18n.t('your-health.please-select-hormone-treatments')),
    }),

    hasHeartDisease: Yup.string().required(),
    hasDiabetes: Yup.string().required(),
    hasHayfever: Yup.string().required(),
    hasEczema: Yup.string().required(),
    hasAsthma: Yup.string().required(),
    hasLungDisease: Yup.string().required(),
    smokerStatus: Yup.string().required(),
    smokedYearsAgo: Yup.number().when('smokerStatus', {
      is: 'not_currently',
      then: Yup.number().required(),
    }),
    hasKidneyDisease: Yup.string().required(),

    hasCancer: Yup.string().required(),
    cancerType: Yup.string().when('hasCancer', {
      is: (value) => isUSCountry() && value && value === 'yes',
      then: Yup.string().required(),
    }),

    doesChemiotherapy: Yup.string(),
    takesImmunosuppressants: Yup.string().required(),
    takesAspirin: Yup.string().required(),
    takesCorticosteroids: Yup.string().required(),
    takesBloodPressureMedications: Yup.string().required(), // pril
    takesAnyBloodPressureMedications: Yup.string().required(),
    takesBloodPressureMedicationsSartan: Yup.string().required(),
    vitaminSupplements: Yup.array<string>().min(1, i18n.t('your-health.vitamins.please-select-vitamins')),
    vitaminOther: Yup.string().when('vitaminSupplements', {
      is: (val: string[]) => val.includes(supplementValues.OTHER),
      then: Yup.string(),
    }),
  });

  handleUpdateHealth(formData: YourHealthData) {
    const currentPatient = patientCoordinator.patientData.patientState;
    const patientId = currentPatient.patientId;
    var infos = this.createPatientInfos(formData);

    this.patientService
      .updatePatient(patientId, infos)
      .then((_) => {
        currentPatient.hasCompletedPatientDetails = true;
        currentPatient.hasBloodPressureAnswer = true;
        currentPatient.hasPeriodAnswer = true;
        currentPatient.hasHormoneTreatmentAnswer = true;
        currentPatient.hasVitaminAnswer = true;
        currentPatient.hasAtopyAnswers = true;
        if (formData.diabetesType) {
          currentPatient.hasDiabetesAnswers = true;
          currentPatient.shouldAskExtendedDiabetes = false;
        }
        if (formData.hasHayfever === 'yes') currentPatient.hasHayfever = true;
        if (formData.bloodGroup) currentPatient.hasBloodGroupAnswer = true;

        patientCoordinator.gotoNextScreen(this.props.route.name);
      })
      .catch((_) => {
        this.setState({ errorMessage: 'Something went wrong, please try again later' });
      });
  }

  private createPatientInfos(formData: YourHealthData) {
    const smokerStatus = formData.smokerStatus === 'no' ? 'never' : formData.smokerStatus;
    const vitamin_supplements_doc = VitaminSupplementsQuestion.createSupplementsDoc(
      formData.vitaminSupplements as SupplementValue[],
      formData.vitaminOther as string
    );
    let infos = {
      has_heart_disease: formData.hasHeartDisease === 'yes',
      has_diabetes: formData.hasDiabetes === 'yes',
      has_hayfever: formData.hasHayfever === 'yes',
      has_eczema: formData.hasEczema === 'yes',
      has_asthma: formData.hasAsthma === 'yes',
      has_lung_disease_only: formData.hasLungDisease === 'yes',
      has_kidney_disease: formData.hasKidneyDisease === 'yes',
      has_cancer: formData.hasCancer === 'yes',
      takes_immunosuppressants: formData.takesImmunosuppressants === 'yes',
      takes_aspirin: formData.takesAspirin === 'yes',
      takes_corticosteroids: formData.takesCorticosteroids === 'yes',
      takes_any_blood_pressure_medications: formData.takesAnyBloodPressureMedications === 'yes',
      limited_activity: formData.limitedActivity === 'yes',
      ...vitamin_supplements_doc,
      ...BloodGroupQuestion.createDTO(formData),
    } as Partial<PatientInfosRequest>;

    if (this.state.showPregnancyQuestion) {
      infos = {
        ...infos,
        is_pregnant: formData.isPregnant === 'yes',
      };
    }

    if (infos.takes_any_blood_pressure_medications) {
      infos = {
        ...infos,
        takes_blood_pressure_medications: formData.takesBloodPressureMedications === 'yes', // pril
        takes_blood_pressure_medications_sartan: formData.takesBloodPressureMedicationsSartan === 'yes',
      };
    }

    if (smokerStatus) {
      infos = {
        ...infos,
        smoker_status: smokerStatus,
      };

      if (smokerStatus === 'not_currently') {
        infos = {
          ...infos,
          smoked_years_ago: stripAndRound(formData.smokedYearsAgo),
        };
      }
    }

    if (infos.has_cancer) {
      infos = {
        ...infos,
        does_chemiotherapy: formData.doesChemiotherapy === 'yes',
      };

      if (isUSCountry()) {
        infos = {
          ...infos,
          cancer_type: formData.cancerType,
        };
      }
    }

    if (this.state.showPeriodQuestion) {
      const periodDoc = PeriodQuestion.createPeriodDoc(formData);
      infos = {
        ...infos,
        ...periodDoc,
      };
    }

    if (this.state.showHormoneTherapyQuestion && formData.hormoneTreatment.length) {
      const treatmentsDoc = HormoneTreatmentQuestion.createTreatmentsDoc(formData.hormoneTreatment as TreatmentValue[]);
      infos = {
        ...infos,
        ...treatmentsDoc,
      };
    }

    if (this.state.showDiabetesQuestion) {
      infos = {
        ...infos,
        ...DiabetesQuestions.createDTO(formData),
      };
    }

    return infos;
  }

  render() {
    const currentPatient = patientCoordinator.patientData.patientState;
    const smokerStatusItems = [
      { label: i18n.t('your-health.never-smoked'), value: 'never' },
      { label: i18n.t('your-health.not-currently-smoking'), value: 'not_currently' },
      { label: i18n.t('your-health.yes-smoking'), value: 'yes' },
    ];
    return (
      <Screen profile={currentPatient.profile} navigation={this.props.navigation}>
        <Header>
          <HeaderText>{i18n.t('your-health.page-title')}</HeaderText>
        </Header>

        <ProgressBlock>
          <ProgressStatus step={3} maxSteps={6} />
        </ProgressBlock>

        <Formik
          initialValues={{
            ...initialFormValues,
            ...BloodPressureMedicationQuestion.initialFormValues(),
            ...PeriodQuestion.initialFormValues(),
            ...HormoneTreatmentQuestion.initialFormValues(),
            ...VitaminSupplementsQuestion.initialFormValues(),
            ...AtopyQuestions.initialFormValues(),
            ...DiabetesQuestions.initialFormValues(),
            ...BloodGroupQuestion.initialFormValues(),
          }}
          validationSchema={() => {
            let schema = this.registerSchema;
            schema = schema.concat(BloodGroupQuestion.schema());
            if (this.state.showDiabetesQuestion) {
              schema = schema.concat(DiabetesQuestions.schema());
            }
            return schema;
          }}
          onSubmit={(values: YourHealthData) => {
            return this.handleUpdateHealth(values);
          }}>
          {(props) => {
            return (
              <Form>
                <YesNoField
                  selectedValue={props.values.limitedActivity}
                  onValueChange={props.handleChange('limitedActivity')}
                  label={i18n.t('your-health.health-problems-that-limit-activity')}
                />

                {this.state.showPregnancyQuestion && (
                  <>
                    <YesNoField
                      selectedValue={props.values.isPregnant}
                      onValueChange={props.handleChange('isPregnant')}
                      label={i18n.t('your-health.are-you-pregnant')}
                    />
                  </>
                )}

                {this.state.showPeriodQuestion && <PeriodQuestion formikProps={props as FormikProps<PeriodData>} />}

                {this.state.showHormoneTherapyQuestion && (
                  <HormoneTreatmentQuestion formikProps={props as FormikProps<HormoneTreatmentData>} />
                )}

                <YesNoField
                  selectedValue={props.values.hasHeartDisease}
                  onValueChange={props.handleChange('hasHeartDisease')}
                  label={i18n.t('your-health.have-heart-disease')}
                />

                <YesNoField
                  selectedValue={props.values.hasDiabetes}
                  onValueChange={(value: string) => {
                    props.handleChange('hasDiabetes');
                    this.setState({ showDiabetesQuestion: value === 'yes' });
                  }}
                  label={i18n.t('your-health.have-diabetes')}
                />

                {this.state.showDiabetesQuestion && (
                  <DiabetesQuestions formikProps={props as FormikProps<DiabetesData>} />
                )}

                <AtopyQuestions formikProps={props as FormikProps<AtopyData>} />

                <DropdownField
                  selectedValue={props.values.smokerStatus}
                  onValueChange={props.handleChange('smokerStatus')}
                  label={i18n.t('your-health.is-smoker')}
                  items={smokerStatusItems}
                  error={props.touched.smokerStatus && props.errors.smokerStatus}
                />

                {props.values.smokerStatus === 'not_currently' && (
                  <GenericTextField
                    formikProps={props}
                    label={i18n.t('your-health.years-since-last-smoked')}
                    name="smokedYearsAgo"
                    keyboardType="numeric"
                  />
                )}

                <YesNoField
                  selectedValue={props.values.hasKidneyDisease}
                  onValueChange={props.handleChange('hasKidneyDisease')}
                  label={i18n.t('your-health.has-kidney-disease')}
                />

                <YesNoField
                  selectedValue={props.values.hasCancer}
                  onValueChange={props.handleChange('hasCancer')}
                  label={i18n.t('your-health.has-cancer')}
                />

                {props.values.hasCancer === 'yes' && (
                  <>
                    {isUSCountry() && (
                      <>
                        <GenericTextField
                          formikProps={props}
                          label={i18n.t('your-health.what-cancer-type')}
                          name="cancerType"
                        />
                      </>
                    )}
                    <YesNoField
                      selectedValue={props.values.doesChemiotherapy}
                      onValueChange={props.handleChange('doesChemiotherapy')}
                      label={i18n.t('your-health.is-on-chemotherapy')}
                    />
                  </>
                )}

                <YesNoField
                  selectedValue={props.values.takesImmunosuppressants}
                  onValueChange={props.handleChange('takesImmunosuppressants')}
                  label={i18n.t('your-health.takes-immunosuppressant')}
                />

                <YesNoField
                  selectedValue={props.values.takesAspirin}
                  onValueChange={props.handleChange('takesAspirin')}
                  label={i18n.t('your-health.takes-asprin')}
                />

                <YesNoField
                  selectedValue={props.values.takesCorticosteroids}
                  onValueChange={props.handleChange('takesCorticosteroids')}
                  label={i18n.t('your-health.takes-nsaids')}
                />

                <BloodPressureMedicationQuestion formikProps={props as FormikProps<BloodPressureData>} />

                <VitaminSupplementsQuestion formikProps={props as FormikProps<VitaminSupplementData>} />

                <BloodGroupQuestion formikProps={props as FormikProps<BloodGroupData>} />

                <ErrorText>{this.state.errorMessage}</ErrorText>
                {!!Object.keys(props.errors).length && props.submitCount > 0 && (
                  <ValidationError error={i18n.t('validation-error-text')} />
                )}

                <BrandedButton onPress={props.handleSubmit}>{i18n.t('next-question')}</BrandedButton>
              </Form>
            );
          }}
        </Formik>
      </Screen>
    );
  }
}
