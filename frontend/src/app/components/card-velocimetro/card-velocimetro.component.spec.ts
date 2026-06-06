import { CardVelocimetroComponent } from './card-velocimetro.component';

jest.mock('@angular/common', () => ({
  CommonModule: {},
}));

jest.mock('@angular/core', () => {
  const mockInput = <T>(initialValue?: T): any => {
    let val: T | undefined = initialValue;
    const s: any = (newVal?: T) => {
      if (newVal !== undefined) val = newVal;
      return val;
    };
    s.required = s;
    return s;
  };

  const mockComputed = (fn: () => any) => {
    return () => fn();
  };

  return {
    Component: () => (target: any) => target,
    ChangeDetectionStrategy: { OnPush: 0 },
    input: mockInput,
    computed: mockComputed,
  };
});

describe('CardVelocimetroComponent Unit Tests', () => {
  let component: CardVelocimetroComponent;

  beforeEach(() => {
    component = new CardVelocimetroComponent();
  });

  it('should initialize with default input values', () => {
    expect(component.goal()).toBe(500);
    expect(component.current()).toBe(0);
  });

  it('should correctly calculate percentages and angles', () => {
    // Set mock input values
    (component.goal as any)(1000);
    (component.current as any)(500);

    expect(component.percentage()).toBe(0.5);
    expect(component.percentLabel()).toBe('50%');
    expect(component.needleAngle()).toBe(0); // -90 + (0.5 * 180) = 0
  });

  it('should transition status colors based on budget thresholds', () => {
    // Under budget (< 70%)
    (component.goal as any)(100);
    (component.current as any)(60);
    expect(component.status()).toBe('under');
    expect(component.statusLabel()).toBe('On Target');

    // Warning budget (70% - 100%)
    (component.current as any)(85);
    expect(component.status()).toBe('warning');
    expect(component.statusLabel()).toBe('Warning');

    // Over budget (> 100%)
    (component.current as any)(110);
    expect(component.status()).toBe('over');
    expect(component.statusLabel()).toBe('Budget Exceeded');
  });

  it('should format currencies correctly', () => {
    const result = component.format(1500.5);
    const cleanResult = result.replace(/\u00a0/g, ' ');
    expect(cleanResult).toContain('R$');
    expect(cleanResult).toContain('1.500,50');
  });
});
